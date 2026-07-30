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
  // Firebase returns auth/invalid-login-credentials for a wrong password on
  // projects with email enumeration protection, and auth/invalid-credential on
  // others. Match both — the shared substring is 'credential'.
  if (code.includes('credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'That email and password combination was not recognised.';
  if (code.includes('invalid-email')) return 'That does not look like an email address.';
  if (code.includes('user-disabled')) return 'That account has been disabled.';
  if (code.includes('too-many-requests'))
    return 'Too many failed attempts. Wait a minute, or reset the password below.';
  if (code.includes('network')) return 'Could not reach Firebase. Check your connection.';
  if (code.includes('operation-not-allowed'))
    return 'Email/password sign-in is switched off for this project.';
  // Anything unmapped names its code, so the next surprise is diagnosable
  // rather than a dead end.
  return `Could not sign in${code ? ` (${code})` : ''}.`;
}

export function resetErrorMessage(err) {
  const code = err?.code || '';
  if (code.includes('invalid-email')) return 'That does not look like an email address.';
  if (code.includes('too-many-requests')) return 'Too many requests. Wait a minute and try again.';
  return `Could not send the reset email${code ? ` (${code})` : ''}.`;
}
