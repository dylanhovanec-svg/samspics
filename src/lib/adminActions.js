import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../firebase.js';

export function setHidden(eventId, photoId, hidden) {
  return updateDoc(doc(db, 'events', eventId, 'photos', photoId), { hidden });
}

// Storage object first, then the record. If the file is already gone the record
// should still go — otherwise a half-deleted photo can never be cleared.
export async function deletePhoto(eventId, photo) {
  if (photo.storagePath) {
    try {
      await deleteObject(ref(storage, photo.storagePath));
    } catch (err) {
      if (err?.code !== 'storage/object-not-found') throw err;
    }
  }
  await deleteDoc(doc(db, 'events', eventId, 'photos', photo.id));
}

// The event doc may not exist yet — merge so the first title save creates it.
export function saveTitle(eventId, title, exists) {
  const payload = exists ? { title } : { title, createdAt: serverTimestamp() };
  return setDoc(doc(db, 'events', eventId), payload, { merge: true });
}

export function signInErrorMessage(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'That email and password combination was not recognised.';
  if (code.includes('invalid-email')) return 'That does not look like an email address.';
  if (code.includes('too-many-requests'))
    return 'Too many attempts. Wait a minute and try again.';
  if (code.includes('network')) return 'Could not reach Firebase. Check your connection.';
  return 'Could not sign in. Please try again.';
}
