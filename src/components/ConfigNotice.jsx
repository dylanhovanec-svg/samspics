import { isConfigured, missingEnvKeys } from '../firebase.js';
import { defaultEventId } from '../lib/eventId.js';

// Shown on every surface until the Firebase env vars are filled in. Without it
// an unconfigured deploy just renders an empty screen with a console error.
export default function ConfigNotice() {
  const missing = [...missingEnvKeys];
  if (!defaultEventId) missing.push('VITE_EVENT_ID');
  if (isConfigured && missing.length === 0) return null;

  return (
    <div
      style={{
        margin: '0 auto',
        maxWidth: 560,
        padding: '16px 20px',
        borderRadius: 14,
        border: '1px solid rgba(224,106,138,0.4)',
        background: 'rgba(224,106,138,0.12)',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: 'var(--rose)' }}>Not configured yet.</strong>{' '}
      Copy <code>.env.example</code> to <code>.env</code> and fill in:
      <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--muted)' }}>
        {missing.map((key) => (
          <li key={key}>
            <code>{key}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
