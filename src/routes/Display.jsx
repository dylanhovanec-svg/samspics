import ConfigNotice from '../components/ConfigNotice.jsx';
import { defaultEventId } from '../lib/eventId.js';

// Step 4 replaces this with the ported EventPhotoCircle carousel, live-subscribed
// to events/{eventId}/photos where hidden == false, ordered by createdAt.
export default function Display() {
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
      <div className="eyebrow">Photo Circle</div>
      <h1 className="display-heading" style={{ fontSize: 'clamp(26px,4.4vw,52px)', margin: 0 }}>
        Display
      </h1>
      <p style={{ color: 'var(--muted)', margin: 0 }}>
        {defaultEventId ? `Event: ${defaultEventId}` : 'No event id set'}
      </p>
      <ConfigNotice />
    </main>
  );
}
