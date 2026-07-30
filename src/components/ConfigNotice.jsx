import { configWarnings, isConfigured, missingEnvKeys } from '../firebase.js';
import { defaultEventId } from '../lib/eventId.js';

// Shown on every surface when the Firebase env vars are missing or malformed.
// Without it an unconfigured deploy either renders an empty screen or fails
// later with an error that points nowhere near the actual cause.
export default function ConfigNotice() {
  const missing = [...missingEnvKeys];
  if (!defaultEventId) missing.push('VITE_EVENT_ID');
  if (isConfigured && missing.length === 0 && configWarnings.length === 0) return null;

  return (
    <div
      style={{
        margin: '0 auto',
        maxWidth: 620,
        padding: '16px 20px',
        borderRadius: 14,
        border: '1px solid rgba(224,106,138,0.4)',
        background: 'rgba(224,106,138,0.12)',
        fontSize: 14,
        lineHeight: 1.5,
        textAlign: 'left',
      }}
    >
      <strong style={{ color: 'var(--rose)' }}>Configuration problem.</strong>{' '}
      This build was made with a bad <code>.env</code>. Fix it, rebuild, redeploy.
      {missing.length > 0 ? (
        <>
          <div style={{ marginTop: 10 }}>Missing:</div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20, color: 'var(--muted)' }}>
            {missing.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {configWarnings.length > 0 ? (
        <ul style={{ margin: '10px 0 0', paddingLeft: 20, color: 'var(--muted)' }}>
          {configWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
