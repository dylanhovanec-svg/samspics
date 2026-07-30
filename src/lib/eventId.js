const FALLBACK = import.meta.env.VITE_EVENT_ID || '';

// The display and admin surfaces always use the build-time event. The guest
// upload page is reached by QR, so it accepts ?e= and falls back to the env var.
export function getEventId(search) {
  if (search) {
    const fromQuery = new URLSearchParams(search).get('e');
    if (fromQuery) return fromQuery;
  }
  return FALLBACK;
}

export const defaultEventId = FALLBACK;
