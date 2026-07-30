import ConfigNotice from '../components/ConfigNotice.jsx';
import { defaultEventId } from '../lib/eventId.js';

// Step 5 replaces this with the auth gate plus bulk seed, moderation grid,
// event title editor and QR generator.
export default function Admin() {
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
      <div className="eyebrow">Console</div>
      <h1 className="display-heading" style={{ fontSize: 'clamp(24px,5vw,40px)', margin: 0 }}>
        Admin
      </h1>
      <p style={{ color: 'var(--muted)', margin: 0 }}>
        {defaultEventId ? `Event: ${defaultEventId}` : 'No event id set'}
      </p>
      <ConfigNotice />
    </main>
  );
}
