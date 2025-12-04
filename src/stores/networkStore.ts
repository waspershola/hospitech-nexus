/**
 * Network Store - Phase 12
 * Zustand store for reactive network state management
 */

import { create } from 'zustand';

interface NetworkState {
  online: boolean;
  hardOffline: boolean;
  lastChange: number | null;
}

interface NetworkStore extends NetworkState {
  setFromGlobal: () => void;
  setFromEvent: (state: Partial<NetworkState>) => void;
  setOnline: (online: boolean) => void;
  setHardOffline: (hardOffline: boolean) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  hardOffline: false,
  lastChange: null,

  setFromGlobal: () => {
    const networkState = (window as any).__NETWORK_STATE__;
    const hardOffline = (window as any).__HARD_OFFLINE__ ?? false;
    
    set({
      online: networkState?.online ?? navigator.onLine,
      hardOffline,
      lastChange: Date.now(),
    });
  },

  setFromEvent: (state) => {
    set((prev) => ({
      ...prev,
      ...state,
      lastChange: Date.now(),
    }));
  },

  setOnline: (online) => {
    set({ online, lastChange: Date.now() });
  },

  setHardOffline: (hardOffline) => {
    set({ hardOffline, lastChange: Date.now() });
  },
}));
