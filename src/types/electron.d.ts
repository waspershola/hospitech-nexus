/**
 * Global type declarations for Electron API in renderer
 * Ensures TypeScript recognizes window.electronAPI throughout React app
 */

import type { ElectronAPI as BaseElectronAPI } from '../../electron/types';

/**
 * Network state returned by Electron bridge
 */
export interface NetworkState {
  online: boolean;
  hardOffline: boolean;
  lastChange?: string | null;
}

/**
 * Extended ElectronAPI with new network state methods
 */
export interface ExtendedElectronAPI extends BaseElectronAPI {
  getNetworkState?: () => Promise<NetworkState>;
  onNetworkChanged?: (callback: (state: NetworkState) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ExtendedElectronAPI;
    __NETWORK_STATE__?: NetworkState;
    __HARD_OFFLINE__?: boolean;
  }
}

export {};
