/**
 * Global type declarations for Electron API in renderer
 * Ensures TypeScript recognizes window.electronAPI throughout React app
 */

import type { ElectronAPI } from '../../electron/types';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
