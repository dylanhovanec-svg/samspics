import { useMemo } from 'react';
import { useLocation } from 'react-router';
import PhotoCircle from '../components/PhotoCircle.jsx';
import ConfigNotice from '../components/ConfigNotice.jsx';
import { usePhotos } from '../hooks/usePhotos.js';
import { useEventDoc } from '../hooks/useEventDoc.js';
import { defaultEventId } from '../lib/eventId.js';
import { isConfigured } from '../firebase.js';

const DEMO_GRADIENTS = [
  'linear-gradient(135deg,#e8b84b,#e0662f)',
  'linear-gradient(135deg,#e06a8a,#8a4bd9)',
  'linear-gradient(135deg,#4bd9c9,#3f7de0)',
  'linear-gradient(135deg,#f2c14e,#e06a8a)',
  'linear-gradient(135deg,#8a4bd9,#3f7de0)',
  'linear-gradient(135deg,#e0662f,#e06a8a)',
];

// Stand-ins for rehearsing the display before any photos exist. /?demo gives
// six; /?demo=40 gives forty, which is how the ring gets checked at the sizes a
// real event produces.
function demoPhotos(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `demo-${i}`,
    bg: DEMO_GRADIENTS[i % DEMO_GRADIENTS.length],
  }));
}

export default function Display() {
  const { search } = useLocation();
  const demoParam = new URLSearchParams(search).get('demo');
  const demo = demoParam !== null;
  const demoCount = Math.min(Math.max(parseInt(demoParam, 10) || 6, 1), 500);

  const event = useEventDoc(defaultEventId);
  const { photos, status, error } = usePhotos(demo ? null : defaultEventId);

  // Memoised so the array identity is stable — PhotoCircle keys effects off it.
  const demoSet = useMemo(() => demoPhotos(demoCount), [demoCount]);
  const shown = demo ? demoSet : photos;
  const title = event?.title || 'Our Event';

  let emptyMessage = 'Scan the QR code to add the first photo.';
  if (!isConfigured) emptyMessage = 'Firebase is not configured yet.';
  else if (status === 'loading') emptyMessage = 'Loading photos…';
  else if (status === 'error') {
    emptyMessage = error?.message?.includes('index')
      ? 'The Firestore index is still building — this clears on its own in a minute.'
      : `Could not load photos: ${error?.message ?? 'unknown error'}`;
  }

  return (
    <>
      <div style={{ padding: '20px 20px 0' }}>
        <ConfigNotice />
      </div>
      <PhotoCircle photos={shown} title={title} emptyMessage={emptyMessage} />
    </>
  );
}
