/**
 * Zustand store for reactive network state management
 * Syncs with window.__NETWORK_STATE__ globals from Electron bridge
 * ELECTRON-ONLY-V1: SPA ignores offline state changes
 */

import { create } from 'zustand';
import type { NetworkState } from '@/types/electron';
import { isElectronContext } from '@/lib/offline/offlineTypes';

// Lazy import to avoid circular dependency
let offlineRuntimeController: any = null;
const getController = () => {
  if (!offlineRuntimeController) {
    import('@/lib/offline/offlineRuntimeController').then(m => {
      offlineRuntimeController = m.offlineRuntimeController;
    });
  }
  return offlineRuntimeController;
};

interface NetworkStore extends NetworkState {
  setFromGlobal: () => void;
  setFromEvent: (state: Partial<NetworkState>) => void;
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  online: true,
  hardOffline: false,
  lastChange: null,

  setFromGlobal: () => {
    // ELECTRON-ONLY-V1: SPA doesn't sync from globals
    if (!isElectronContext()) return;
    
    const g = window.__NETWORK_STATE__;
    if (g) {
      set({
        online: g.online,
        hardOffline: g.hardOffline,
        lastChange: g.lastChange ?? null,
      });
      
      // Notify controller of initial state
      const controller = getController();
      controller?.updateNetworkState(g.online, g.hardOffline);
    }
  },

  setFromEvent: (state) => {
    // ELECTRON-ONLY-V1: SPA always stays "online" - ignore network state changes
    if (!isElectronContext()) {
      return;
    }
    
    const newOnline = state.online ?? true;
    const newHardOffline = state.hardOffline ?? false;
    
    set({
      online: newOnline,
      hardOffline: newHardOffline,
      lastChange: state.lastChange ?? null,
    });
    
    // Notify controller of state change
    const controller = getController();
    controller?.updateNetworkState(newOnline, newHardOffline);
  },
}));
