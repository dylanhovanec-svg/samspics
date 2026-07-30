import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Stamped into the bundle so a deployed page can state which commit it is.
// "Did that actually deploy?" is otherwise unanswerable from a screenshot.
function buildId() {
  let sha = 'unknown';
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    // Not a git checkout — fall through to the timestamp alone.
  }
  return `${sha} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
});
