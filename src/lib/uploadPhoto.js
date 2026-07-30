import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase.js';
import { downscale } from './downscale.js';

// Phones hand over HEIC often enough that a hard failure here would lose photos
// at the event. Fall back to the original file if the browser can't decode it —
// bigger upload, but the photo still lands.
async function prepare(file) {
  try {
    const blob = await downscale(file);
    if (blob) return { blob, ext: 'jpg' };
  } catch {
    // fall through
  }
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  return { blob: file, ext };
}

// A Firestore write made while offline resolves against the local cache and
// never settles against the server, so addDoc can hang indefinitely. Bound
// every step so the guest always gets an answer.
const STEP_TIMEOUT_MS = 25000;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        const err = new Error(`${label} timed out`);
        err.code = 'app/timeout';
        reject(err);
      }, STEP_TIMEOUT_MS)
    ),
  ]);
}

// Shared by the guest page and the admin bulk seed — the only difference is the
// source field and which optional fields are set.
export async function uploadPhoto({ eventId, file, source, caption, uploaderName }) {
  if (!db || !storage) throw new Error('Firebase is not configured.');
  if (!eventId) throw new Error('No event id.');

  const { blob, ext } = await prepare(file);
  const storagePath = `events/${eventId}/uploads/${crypto.randomUUID()}.${ext}`;

  await withTimeout(
    uploadBytes(ref(storage, storagePath), blob, { contentType: blob.type || 'image/jpeg' }),
    'Upload'
  );
  const url = await withTimeout(getDownloadURL(ref(storage, storagePath)), 'Download URL');

  const photo = {
    url,
    storagePath,
    source,
    // Guest photos go live immediately. To hold them for approval instead, set
    // this to true here and relax the `d.hidden == false` check in
    // firestore.rules to allow it.
    hidden: false,
    createdAt: serverTimestamp(),
  };
  const trimmedCaption = caption?.trim();
  const trimmedName = uploaderName?.trim();
  if (trimmedCaption) photo.caption = trimmedCaption.slice(0, 140);
  if (trimmedName) photo.uploaderName = trimmedName.slice(0, 60);

  await withTimeout(addDoc(collection(db, 'events', eventId, 'photos'), photo), 'Saving photo');
  return photo;
}

// Firebase's raw messages are not for guests standing in a venue.
export function friendlyError(err) {
  const code = err?.code || '';
  if (code.includes('unauthorized') || code.includes('permission-denied'))
    return "This event isn't accepting photos right now. Check with the host.";
  if (code === 'app/timeout')
    return 'That took too long — the connection here may be weak. Tap to try again.';
  if (code.includes('retry-limit') || code.includes('unavailable'))
    return 'The connection dropped. Check your signal and try again.';
  if (code.includes('quota')) return 'The photo album is full. Let the host know.';
  if (code.includes('canceled')) return 'Upload cancelled.';
  if (err?.message?.includes('not configured')) return 'This page is not set up yet.';
  return 'Something went wrong sending your photo. Please try again.';
}
