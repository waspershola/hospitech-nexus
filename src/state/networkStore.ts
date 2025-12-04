/**
 * Zustand store for reactive network state management
 * Syncs with window.__NETWORK_STATE__ globals from Electron bridge
 */

import { create } from 'zustand';
import type { NetworkState } from '@/types/electron';

interface NetworkStore extends NetworkState {
  setFromGlobal: () => void;
  setFromEvent: (state: Partial<NetworkState>) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  online: true,
  hardOffline: false,
  lastChange: null,

  setFromGlobal: () => {
    const g = window.__NETWORK_STATE__;
    if (g) {
      set({
        online: g.online,
        hardOffline: g.hardOffline,
        lastChange: g.lastChange ?? null,
      });
    }
  },

  setFromEvent: (state) =>
    set({
      online: state.online ?? true,
      hardOffline: state.hardOffline ?? false,
      lastChange: state.lastChange ?? null,
    }),
}));
