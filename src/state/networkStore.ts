/**
 * Centralized Network State Store
 * Single source of truth for online/offline status across the SPA
 */
import { create } from 'zustand';

interface NetworkStoreState {
  online: boolean;
  hardOffline: boolean;
  lastChange?: string;
  setFromGlobal: () => void;
  setFromEvent: (state: { online: boolean; hardOffline?: boolean; lastChange?: string }) => void;
}

export const useNetworkStore = create<NetworkStoreState>((set) => ({
  online: true,
  hardOffline: false,
  lastChange: undefined,
  
  setFromGlobal: () => {
    const g = window.__NETWORK_STATE__;
    if (!g) return;
    set({
      online: g.online,
      hardOffline: g.hardOffline ?? !g.online,
      lastChange: g.lastChange,
    });
  },
  
  setFromEvent: (state) =>
    set({
      online: state.online,
      hardOffline: state.hardOffline ?? !state.online,
      lastChange: state.lastChange,
    }),
}));
