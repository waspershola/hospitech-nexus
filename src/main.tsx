import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/qr-themes.css";

// Import store for hydration (non-hook usage)
import { useNetworkStore } from "./state/networkStore";
import type { NetworkState, ExtendedElectronAPI } from "./types/electron";

// 1. Set global defaults immediately (browser-compatible)
window.__NETWORK_STATE__ = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  hardOffline: false,
  lastChange: new Date().toISOString(),
};
window.__HARD_OFFLINE__ = false;

// 2. Async IIFE for Electron hydration + render
(async () => {
  // Cast to extended type for new network APIs
  const electronAPI = window.electronAPI as ExtendedElectronAPI | undefined;

  // Hydrate from Electron if available
  if (electronAPI?.getNetworkState) {
    try {
      const state: NetworkState = await electronAPI.getNetworkState();
      window.__NETWORK_STATE__ = state;
      window.__HARD_OFFLINE__ = state.hardOffline;
      useNetworkStore.getState().setFromGlobal();
      console.log("[OfflineBridge] Electron hydration:", state);
    } catch (err) {
      console.warn("[OfflineBridge] Hydration failed:", err);
    }
  } else {
    // Browser mode - sync store with global defaults
    useNetworkStore.getState().setFromGlobal();
  }

  // 3. Subscribe to Electron network changes
  if (electronAPI?.onNetworkChanged) {
    electronAPI.onNetworkChanged((state: NetworkState) => {
      window.__NETWORK_STATE__ = state;
      window.__HARD_OFFLINE__ = state.hardOffline;
      useNetworkStore.getState().setFromEvent(state);
      console.log("[OfflineBridge] Network changed:", state);
    });
  }

  // 4. Development-only debug helper for network store
  if (import.meta.env.DEV) {
    (window as any).__debugNetworkStore__ = () => useNetworkStore.getState();
    console.log('[Dev] window.__debugNetworkStore__() available');
  }

  // 5. Render React app
  createRoot(document.getElementById("root")!).render(<App />);
})();
