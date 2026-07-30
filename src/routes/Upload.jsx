import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import ConfigNotice from '../components/ConfigNotice.jsx';
import { getEventId } from '../lib/eventId.js';
import { friendlyError, uploadPhoto } from '../lib/uploadPhoto.js';
import { isConfigured } from '../firebase.js';
import './Upload.css';

const MAX_NAME = 60;
const MAX_CAPTION = 140;

// QR scanners on Android frequently open the link inside their own embedded
// WebView rather than handing it to Chrome. Those WebViews commonly refuse
// access to the photo gallery, leaving only the camera — which looks like a bug
// in this page but cannot be fixed from inside it. Detect it and say so.
function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
}

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /; wv\)/.test(ua) ||
    /\b(FBAN|FBAV|Instagram|Line|Snapchat|TikTok|Pinterest|WhatsApp|MicroMessenger)\b/i.test(ua)
  );
}

export default function Upload() {
  const { search } = useLocation();
  const eventId = getEventId(search);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const inApp = isInAppBrowser();
  const android = isAndroid();

  // Object URLs leak if a guest picks several photos before sending.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (e) => {
    const chosen = e.target.files?.[0];
    if (chosen) {
      // Some Android pickers hand back an empty MIME type, so fall back to the
      // extension rather than rejecting a perfectly good photo.
      const looksLikeImage =
        chosen.type.startsWith('image/') ||
        /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(chosen.name || '');
      if (!looksLikeImage) {
        setError('That does not look like a photo. Pick an image and try again.');
        e.target.value = '';
        return;
      }
      setFile(chosen);
      setError(null);
    }
    e.target.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file || state === 'sending') return;
    setState('sending');
    setError(null);
    try {
      await uploadPhoto({ eventId, file, source: 'guest', caption, uploaderName: name });
      setState('done');
    } catch (err) {
      setError(friendlyError(err));
      setState('idle');
    }
  };

  const addAnother = () => {
    setFile(null);
    setCaption('');
    setState('idle');
    setError(null);
    // Name is kept — the same guest usually adds several.
  };

  if (!isConfigured || !eventId) {
    return (
      <main className="up-root">
        <div className="up-card">
          <h1 className="up-title">Add your photo</h1>
          {!eventId && isConfigured ? (
            <p className="up-sub">
              This link is missing its event code. Scan the QR code again, or ask the host.
            </p>
          ) : (
            <ConfigNotice />
          )}
        </div>
      </main>
    );
  }

  if (state === 'done') {
    return (
      <main className="up-root">
        <div className="up-card">
          <div className="up-success-mark">✓</div>
          <h1 className="up-title">Sent!</h1>
          <p className="up-sub">
            Your photo will appear on the big screen in a few seconds. Keep an eye out for it.
          </p>
          <button type="button" className="up-submit" onClick={addAnother}>
            Add another photo
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="up-root">
      <form className="up-card" onSubmit={submit}>
        <div>
          <div className="eyebrow">Photo Wall</div>
          <h1 className="up-title">Add your photo</h1>
        </div>
        <p className="up-sub">It goes straight up on the big screen.</p>

        {!inApp && android ? (
          <div className="up-note">
            Only offered <strong>Camera</strong> and <strong>Files</strong>? Your gallery photos are
            in there — tap <strong>Files</strong>, then <strong>Images</strong> or{' '}
            <strong>Recent</strong>.
          </div>
        ) : null}

        {inApp ? (
          <div className="up-note">
            Only seeing the camera? This page was opened inside another app, which blocks your
            photo gallery. Tap the <strong>⋮</strong> or <strong>Share</strong> icon and choose{' '}
            <strong>Open in browser</strong> — then your gallery will be there.
          </div>
        ) : null}

        <button
          type="button"
          className={`up-pick ${preview ? 'has-preview' : ''}`}
          onClick={() => fileRef.current?.click()}
          style={preview ? { backgroundImage: `url(${preview})` } : undefined}
        >
          {preview ? (
            <span className="up-retake">Tap to choose a different one</span>
          ) : (
            <>
              <span className="up-pick-icon" aria-hidden="true">
                ＋
              </span>
              Choose a photo
              <span className="up-pick-hint">From your library, or take a new one</span>
            </>
          )}
        </button>
        {/* Bare accept="image/*", deliberately.

            No `capture`: on iOS that forces the camera and drops the photo
            library. And no file extensions alongside image/*: Android maps
            unrecognised extensions to application/octet-stream, which turns the
            picker into a generic file chooser and drops the gallery — the
            opposite of the intent. The chosen file is validated in JS instead. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={pick}
          style={{ display: 'none' }}
        />

        <div className="up-field">
          <label htmlFor="up-name">Your name (optional)</label>
          <input
            id="up-name"
            value={name}
            maxLength={MAX_NAME}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="up-field">
          <label htmlFor="up-caption">Caption (optional)</label>
          <textarea
            id="up-caption"
            rows={2}
            value={caption}
            maxLength={MAX_CAPTION}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className="up-count">
            {caption.length}/{MAX_CAPTION}
          </div>
        </div>

        {error ? (
          <div className="up-error" role="alert">
            {error}
          </div>
        ) : null}

        <button type="submit" className="up-submit" disabled={!file || state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send it to the screen'}
        </button>
      </form>
    </main>
  );
}
