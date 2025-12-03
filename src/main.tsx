import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/qr-themes.css";
import { useNetworkStore } from './state/networkStore';

// Type for network state
interface NetworkState {
  online: boolean;
  hardOffline: boolean;
  lastChange?: string;
}

// 1) Set conservative defaults (works in browser too)
window.__NETWORK_STATE__ = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  hardOffline: false,
  lastChange: new Date().toISOString(),
};
window.__HARD_OFFLINE__ = false;

// 2) Hydrate from Electron if available and subscribe to changes
(async () => {
  const electronAPI = window.electronAPI as any;
  
  try {
    // Try new getNetworkState API first
    if (electronAPI?.getNetworkState) {
      const state: NetworkState = await electronAPI.getNetworkState();
      window.__NETWORK_STATE__ = state;
      window.__HARD_OFFLINE__ = state.hardOffline ?? !state.online;
      console.log('[OfflineBridge] Hydrated from Electron:', state);
    }
  } catch (err) {
    console.warn("[OfflineBridge] Failed to hydrate network state:", err);
  }

  // Update Zustand store with initial state
  useNetworkStore.getState().setFromGlobal();

  // 3) Subscribe to future changes - try new API first
  if (electronAPI?.onNetworkChanged) {
    electronAPI.onNetworkChanged((state: NetworkState) => {
      window.__NETWORK_STATE__ = state;
      window.__HARD_OFFLINE__ = state.hardOffline ?? !state.online;
      useNetworkStore.getState().setFromEvent(state);
      console.log("[OfflineBridge] Network changed:", state);
    });
  }
  
  // Fallback: Also subscribe to legacy onOnlineStatusChange if available
  if (electronAPI?.onOnlineStatusChange) {
    electronAPI.onOnlineStatusChange((isOnline: boolean) => {
      const state: NetworkState = { 
        online: isOnline, 
        hardOffline: !isOnline, 
        lastChange: new Date().toISOString() 
      };
      window.__NETWORK_STATE__ = state;
      window.__HARD_OFFLINE__ = !isOnline;
      useNetworkStore.getState().setFromEvent(state);
      console.log("[OfflineBridge] Legacy status change:", state);
    });
  }

  // Browser fallback: listen to native online/offline events
  if (typeof window !== 'undefined' && !electronAPI) {
    window.addEventListener('online', () => {
      const state: NetworkState = { online: true, hardOffline: false, lastChange: new Date().toISOString() };
      window.__NETWORK_STATE__ = state;
      window.__HARD_OFFLINE__ = false;
      useNetworkStore.getState().setFromEvent(state);
      console.log("[OfflineBridge] Browser online");
    });
    
    window.addEventListener('offline', () => {
      const state: NetworkState = { online: false, hardOffline: true, lastChange: new Date().toISOString() };
      window.__NETWORK_STATE__ = state;
      window.__HARD_OFFLINE__ = true;
      useNetworkStore.getState().setFromEvent(state);
      console.log("[OfflineBridge] Browser offline");
    });
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
