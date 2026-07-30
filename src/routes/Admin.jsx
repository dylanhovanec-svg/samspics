import { useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import QRCode from 'qrcode';
import ConfigNotice from '../components/ConfigNotice.jsx';
import { auth, isConfigured } from '../firebase.js';
import { defaultEventId } from '../lib/eventId.js';
import { useAllPhotos } from '../hooks/useAllPhotos.js';
import { useEventDoc } from '../hooks/useEventDoc.js';
import { uploadPhoto, friendlyError } from '../lib/uploadPhoto.js';
import {
  deletePhoto,
  resetErrorMessage,
  saveTitle,
  setHidden,
  signInErrorMessage,
} from '../lib/adminActions.js';
import './Admin.css';

// Seeding an exported album means dozens to hundreds of files. Sequential is
// too slow to sit through; unbounded saturates the connection and starts timing
// out. Three at a time is the compromise.
const SEED_CONCURRENCY = 3;

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(signInErrorMessage(err));
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter the account email first, then tap reset.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      // Deliberately vague: confirming which addresses have accounts would
      // undo the project's email enumeration protection.
      setNotice('If that address has an account, a reset link is on its way.');
    } catch (err) {
      setError(resetErrorMessage(err));
    }
  };

  return (
    <form className="ad-login" onSubmit={submit}>
      <div className="eyebrow">Console</div>
      <h1 className="ad-h1">Admin sign-in</h1>
      <input
        className="ad-input"
        type="email"
        placeholder="Email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="ad-input"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="ad-btn primary" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error ? <div className="ad-msg error">{error}</div> : null}
      {notice ? <div className="ad-msg">{notice}</div> : null}
      <button type="button" className="ad-link" onClick={resetPassword}>
        Forgot password?
      </button>
    </form>
  );
}

function TitleSection({ eventId, event }) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState(null);
  const loadedFor = useRef(null);

  // Seed the field once the doc arrives, without stomping on in-progress edits.
  useEffect(() => {
    if (event && loadedFor.current !== event.id) {
      loadedFor.current = event.id;
      setValue(event.title || '');
    }
  }, [event]);

  const save = async () => {
    setStatus(null);
    try {
      await saveTitle(eventId, value.trim(), Boolean(event));
      setStatus({ ok: true, text: 'Saved — the display updates on its own.' });
    } catch (err) {
      setStatus({ ok: false, text: `Could not save: ${err.code || err.message}` });
    }
  };

  return (
    <section className="ad-section">
      <h2>Event title</h2>
      <p className="ad-note">Shown above the carousel on the big screen.</p>
      <div className="ad-row">
        <input
          className="ad-input"
          value={value}
          placeholder="Our Event"
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="ad-btn primary" onClick={save}>
          Save
        </button>
      </div>
      {status ? (
        <div className={`ad-msg ${status.ok ? '' : 'error'}`}>{status.text}</div>
      ) : null}
    </section>
  );
}

function SeedSection({ eventId }) {
  const [progress, setProgress] = useState(null); // { done, total, failed }
  const inputRef = useRef(null);

  const seed = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setProgress({ done: 0, total: files.length, failed: [] });
    let cursor = 0;
    const failed = [];

    const worker = async () => {
      while (cursor < files.length) {
        const file = files[cursor++];
        try {
          await uploadPhoto({ eventId, file, source: 'seed' });
        } catch (err) {
          failed.push(`${file.name}: ${friendlyError(err)}`);
        }
        setProgress((p) => ({ ...p, done: p.done + 1, failed: [...failed] }));
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(SEED_CONCURRENCY, files.length) }, worker)
    );
  };

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;
  const running = progress && progress.done < progress.total;

  return (
    <section className="ad-section">
      <h2>Bulk seed</h2>
      <p className="ad-note">
        Load the exported album in one go. Each photo is downscaled before upload and marked as a
        seed photo.
      </p>
      <button
        className="ad-btn primary"
        onClick={() => inputRef.current?.click()}
        disabled={running}
      >
        {running ? `Uploading ${progress.done} of ${progress.total}…` : 'Choose photos'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={seed}
        style={{ display: 'none' }}
      />
      {progress ? (
        <>
          <div className="ad-progress">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className={`ad-msg ${progress.failed.length ? 'error' : ''}`}>
            {running
              ? `${progress.done} of ${progress.total}`
              : `Finished — ${progress.total - progress.failed.length} of ${progress.total} uploaded.`}
            {progress.failed.length ? (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {progress.failed.slice(0, 5).map((f) => (
                  <li key={f}>{f}</li>
                ))}
                {progress.failed.length > 5 ? <li>…and {progress.failed.length - 5} more</li> : null}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ModerationSection({ eventId, photos, error }) {
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const toggle = async (photo) => {
    setBusyId(photo.id);
    setActionError(null);
    try {
      await setHidden(eventId, photo.id, !photo.hidden);
    } catch (err) {
      setActionError(`Could not update: ${err.code || err.message}`);
    }
    setBusyId(null);
  };

  const remove = async (photo) => {
    if (!window.confirm('Delete this photo for good? This cannot be undone.')) return;
    setBusyId(photo.id);
    setActionError(null);
    try {
      await deletePhoto(eventId, photo);
    } catch (err) {
      setActionError(`Could not delete: ${err.code || err.message}`);
    }
    setBusyId(null);
  };

  const hiddenCount = photos.filter((p) => p.hidden).length;

  return (
    <section className="ad-section">
      <h2>Photos</h2>
      <p className="ad-note">
        {photos.length} total{hiddenCount ? `, ${hiddenCount} hidden` : ''}. Hiding takes a photo off
        the screen but keeps it; deleting removes the file too.
      </p>
      {error ? <div className="ad-msg error">Could not load photos: {error.code}</div> : null}
      {actionError ? <div className="ad-msg error">{actionError}</div> : null}
      {photos.length === 0 ? (
        <p className="ad-note">Nothing yet. Seed the album above, or wait for guests to add some.</p>
      ) : (
        <div className="ad-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`ad-tile ${photo.hidden ? 'hidden-photo' : ''}`}
              style={{ backgroundImage: `url(${photo.url})` }}
            >
              {photo.hidden ? <span className="ad-badge">Hidden</span> : null}
              {photo.source === 'guest' ? <span className="ad-badge" style={{ left: 'auto', right: 8 }}>Guest</span> : null}
              <div className="ad-tile-bar">
                <button onClick={() => toggle(photo)} disabled={busyId === photo.id}>
                  {photo.hidden ? 'Show' : 'Hide'}
                </button>
                <button
                  className="danger"
                  onClick={() => remove(photo)}
                  disabled={busyId === photo.id}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QrSection({ eventId }) {
  const [dataUrl, setDataUrl] = useState(null);
  const uploadUrl = useMemo(
    () => `${window.location.origin}/upload?e=${encodeURIComponent(eventId)}`,
    [eventId]
  );

  useEffect(() => {
    // High error correction so it still scans after being printed and taped to
    // a wall in bad light.
    QRCode.toDataURL(uploadUrl, { width: 1024, margin: 2, errorCorrectionLevel: 'H' })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [uploadUrl]);

  return (
    <section className="ad-section">
      <h2>Guest QR code</h2>
      <p className="ad-note">Print this and put it where guests can reach it.</p>
      <div className="ad-qr-wrap">
        {dataUrl ? <img className="ad-qr" src={dataUrl} alt="QR code to the guest upload page" /> : null}
        <div className="ad-qr-side">
          <p className="ad-url">{uploadUrl}</p>
          {dataUrl ? (
            <a className="ad-btn primary" href={dataUrl} download={`${eventId}-qr.png`}>
              Download PNG
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const eventId = defaultEventId;
  const event = useEventDoc(eventId);
  const { photos, error } = useAllPhotos(eventId, Boolean(user));

  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }
    return onAuthStateChanged(auth, (u) => setUser(u ?? null));
  }, []);

  if (!isConfigured) {
    return (
      <main className="ad-root">
        <ConfigNotice />
      </main>
    );
  }

  if (user === undefined) {
    return (
      <main className="ad-root">
        <p className="ad-msg">Checking sign-in…</p>
      </main>
    );
  }

  // ConfigNotice self-hides when the config is sound, so this only appears when
  // there is something concrete to report.
  if (!user)
    return (
      <main className="ad-root">
        <ConfigNotice />
        <SignIn />
      </main>
    );

  return (
    <main className="ad-root">
      <div className="ad-topbar">
        <div>
          <div className="eyebrow">Console</div>
          <h1 className="ad-h1">{eventId}</h1>
        </div>
        <div className="ad-row">
          {/* The UID is shown because writes are authorised by UID in the
              security rules — if moderation fails, this is the value to
              compare against the one in firestore.rules. */}
          <span className="ad-msg">
            {user.email}
            <br />
            <span className="ad-uid">{user.uid}</span>
          </span>
          <button className="ad-btn" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </div>

      <TitleSection eventId={eventId} event={event} />
      <SeedSection eventId={eventId} />
      <QrSection eventId={eventId} />
      <ModerationSection eventId={eventId} photos={photos} error={error} />
    </main>
  );
}
