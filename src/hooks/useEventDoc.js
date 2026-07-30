import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';

// Live subscription to the event document, so retitling from /admin updates the
// big screen without anyone touching the display machine.
export function useEventDoc(eventId) {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (!db || !eventId) return;
    return onSnapshot(
      doc(db, 'events', eventId),
      (snap) => setEvent(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setEvent(null)
    );
  }, [eventId]);

  return event;
}
