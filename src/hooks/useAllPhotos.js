import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';

// Everything in the album, hidden included — the moderation grid needs to show
// what it has already hidden so it can be brought back.
export function useAllPhotos(eventId, enabled) {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !eventId || !enabled) return;
    const q = query(collection(db, 'events', eventId, 'photos'), orderBy('createdAt'));
    return onSnapshot(
      q,
      (snap) => {
        setPhotos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
      },
      (err) => setError(err)
    );
  }, [eventId, enabled]);

  return { photos, error };
}
