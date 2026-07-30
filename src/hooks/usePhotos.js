import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';

// Live subscription to the visible photos for an event, oldest first so newly
// added guest photos land at the end of the ring.
export function usePhotos(eventId) {
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState(db && eventId ? 'loading' : 'idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !eventId) {
      setStatus('idle');
      return;
    }

    setStatus('loading');
    const q = query(
      collection(db, 'events', eventId, 'photos'),
      where('hidden', '==', false),
      orderBy('createdAt')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPhotos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setStatus('ready');
        setError(null);
      },
      (err) => {
        // Most likely the composite index is still building, or the rules
        // haven't been deployed yet. Both are readable in err.message.
        setError(err);
        setStatus('error');
      }
    );

    return unsubscribe;
  }, [eventId]);

  return { photos, status, error };
}
