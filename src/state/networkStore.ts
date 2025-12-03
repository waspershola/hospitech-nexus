/**
 * Zustand store for reactive network state management
 * Syncs with window.__NETWORK_STATE__ globals from Electron bridge
 * ELECTRON-ONLY-V1: SPA ignores offline state changes
 */

import { create } from 'zustand';
import type { NetworkState } from '@/types/electron';
import { isElectronContext } from '@/lib/offline/offlineTypes';

interface NetworkStore extends NetworkState {
  setFromGlobal: () => void;
  setFromEvent: (state: Partial<NetworkState>) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
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
    }
  },

  setFromEvent: (state) => {
    // ELECTRON-ONLY-V1: SPA always stays "online" - ignore network state changes
    if (!isElectronContext()) {
      return;
    }
    
    set({
      online: state.online ?? true,
      hardOffline: state.hardOffline ?? false,
      lastChange: state.lastChange ?? null,
    });
  },
}));
