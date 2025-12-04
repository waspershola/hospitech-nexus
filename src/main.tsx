import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/qr-themes.css";
import { useNetworkStore } from "./stores/networkStore";

// Phase 12: Initialize network state globals for Electron
(window as any).__NETWORK_STATE__ = { online: navigator.onLine };
(window as any).__HARD_OFFLINE__ = false;

// Bootstrap Electron network state if available
const bootstrapElectron = async () => {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.getNetworkState) {
    try {
      const state = await electronAPI.getNetworkState();
      (window as any).__NETWORK_STATE__ = state;
      (window as any).__HARD_OFFLINE__ = !state.online;
      useNetworkStore.getState().setFromGlobal();
    } catch (e) {
      console.log('[main] Electron network bootstrap failed:', e);
    }
  }

  // Subscribe to network changes from Electron
  if (electronAPI?.onNetworkChanged) {
    electronAPI.onNetworkChanged((state: any) => {
      (window as any).__NETWORK_STATE__ = state;
      (window as any).__HARD_OFFLINE__ = !state.online;
      useNetworkStore.getState().setFromEvent({ online: state.online, hardOffline: !state.online });
    });
  }
};

bootstrapElectron();

createRoot(document.getElementById("root")!).render(<App />);
