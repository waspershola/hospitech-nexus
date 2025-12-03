/**
 * Global type declarations for Electron API in renderer
 * Ensures TypeScript recognizes window.electronAPI throughout React app
 */

import type { ElectronAPI, NetworkState } from '../../electron/types';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __NETWORK_STATE__?: NetworkState;
    __HARD_OFFLINE__?: boolean;
  }
}

export type { NetworkState };
export {};
