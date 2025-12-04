/**
 * Electron Detection Boundary
 * Single source of truth for detecting Electron environment
 */

export const isElectron = Boolean(
  typeof window !== 'undefined' &&
  (window as any).electronAPI
);

/**
 * Check if running in Electron context
 * Use this to guard offline-only features
 */
export function isElectronContext(): boolean {
  return isElectron;
}
