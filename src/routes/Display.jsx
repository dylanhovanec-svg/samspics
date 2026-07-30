import { useMemo } from 'react';
import { useLocation } from 'react-router';
import Slideshow from '../components/Slideshow.jsx';
import ConfigNotice from '../components/ConfigNotice.jsx';
import { usePhotos } from '../hooks/usePhotos.js';
import { useEventDoc } from '../hooks/useEventDoc.js';
import { defaultEventId } from '../lib/eventId.js';
import { isConfigured } from '../firebase.js';

// Stand-ins for rehearsing before any photos exist. Deliberately a mix of
// landscape, portrait and square so the letterboxing and blurred backdrop get
// exercised the same way real phone photos will exercise them.
const DEMO_SHAPES = [
  [1600, 1200, '#e8b84b', '#e0662f'],
  [1200, 1600, '#e06a8a', '#8a4bd9'],
  [1600, 900, '#4bd9c9', '#3f7de0'],
  [1080, 1080, '#f2c14e', '#e06a8a'],
  [1200, 1600, '#8a4bd9', '#3f7de0'],
  [1600, 1200, '#e0662f', '#e06a8a'],
];

function demoPhotos(n) {
  return Array.from({ length: n }, (_, i) => {
    const [w, h, a, b] = DEMO_SHAPES[i % DEMO_SHAPES.length];
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>` +
      `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>` +
      `<text x="50%" y="50%" font-family="Georgia,serif" font-size="${Math.round(Math.min(w, h) / 4)}"` +
      ` fill="rgba(0,0,0,0.45)" text-anchor="middle" dominant-baseline="central">${i + 1}</text></svg>`;
    return {
      id: `demo-${i}`,
      url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      caption: i % 3 === 0 ? 'A sample caption for the wall' : undefined,
      uploaderName: i % 3 === 0 ? 'Sample Guest' : undefined,
    };
  });
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
      {/* Overlaid rather than stacked, so a sound config costs no layout. */}
      <div style={{ position: 'fixed', top: 12, left: 12, right: 12, zIndex: 20 }}>
        <ConfigNotice />
      </div>
      <Slideshow photos={shown} title={title} emptyMessage={emptyMessage} />
    </>
  );
}
