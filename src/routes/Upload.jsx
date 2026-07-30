import { useLocation } from 'react-router';
import ConfigNotice from '../components/ConfigNotice.jsx';
import { getEventId } from '../lib/eventId.js';

// Step 3 replaces this with the guest flow: pick photo -> downscale -> upload to
// Storage -> write the photo doc with source:'guest'.
export default function Upload() {
  const { search } = useLocation();
  const eventId = getEventId(search);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      <div className="eyebrow">Add a photo</div>
      <h1 className="display-heading" style={{ fontSize: 'clamp(24px,6vw,38px)', margin: 0 }}>
        Guest Upload
      </h1>
      <p style={{ color: 'var(--muted)', margin: 0 }}>
        {eventId ? `Event: ${eventId}` : 'No event id — scan the QR code again'}
      </p>
      <ConfigNotice />
    </main>
  );
}
