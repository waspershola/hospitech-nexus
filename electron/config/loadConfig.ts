/**
 * SPA Load Configuration for Electron
 * Phase 19: Local SPA Shell Bundled in Electron
 * 
 * Determines how the BrowserWindow loads the React SPA:
 * - 'local': Load from bundled files (production default)
 * - 'remote': Load from remote URL (development/debugging)
 */

export type SpaLoadMode = 'local' | 'remote';

/**
 * Determines whether to load SPA from local files or remote URL
 * 
 * Priority:
 * 1. SPA_LOAD_MODE environment variable (explicit override)
 * 2. NODE_ENV-based default (production = local, development = remote)
 */
export function getSpaLoadMode(): SpaLoadMode {
  const envMode = process.env.SPA_LOAD_MODE?.toLowerCase();

  if (envMode === 'remote') return 'remote';
  if (envMode === 'local') return 'local';

  // Default behavior based on environment
  if (process.env.NODE_ENV === 'production') {
    return 'local';
  }

  return 'remote';
}

/**
 * Gets the remote SPA URL for dev/debug mode
 * 
 * Configurable via:
 * - VITE_DEV_SERVER_URL: Vite dev server (default: http://localhost:8080)
 * - SPA_REMOTE_URL: Custom remote URL (e.g., Vercel preview)
 */
export function getRemoteSpaUrl(): string {
  return process.env.SPA_REMOTE_URL || 
         process.env.VITE_DEV_SERVER_URL || 
         'http://localhost:8080';
}

/**
 * Gets the local SPA index.html path relative to __dirname
 * Adjust this if your build output structure changes
 */
export function getLocalSpaPath(): string {
  return '../dist/index.html';
}
