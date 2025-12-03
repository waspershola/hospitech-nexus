/**
 * Electron Preload Script - Secure IPC Bridge
 * LUXURYHOTELPRO OFFLINE DESKTOP - Phase 1
 * 
 * Exposes minimal typed API to renderer with contextIsolation enabled
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, QueuedRequest, QueueStatus, LogEvent, PrintOptions, UpdateCheckResult, UpdateInfo, SyncEvent, SyncInfo, DiagnosticsState } from './types';

// Validate we're in a secure context
if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in BrowserWindow configuration');
}

/**
 * Expose typed electronAPI to renderer process
 * All IPC calls are validated and sandboxed here
 */
const electronAPI: ElectronAPI = {
  // Desktop detection
  isDesktop: true,

  // Offline queue
  queueRequest: async (req: QueuedRequest): Promise<void> => {
    return ipcRenderer.invoke('queue:add', req);
  },

  getQueueStatus: async (): Promise<QueueStatus> => {
    return ipcRenderer.invoke('queue:status');
  },

  // Connectivity
  onOnlineStatusChange: (callback: (isOnline: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, isOnline: boolean) => {
      callback(isOnline);
    };
    ipcRenderer.on('network:status', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('network:status', listener);
    };
  },

  // Logging
  log: (event: LogEvent): void => {
    ipcRenderer.send('log:event', event);
  },

  // Printing
  printPdf: async (bufferOrUrl: string | ArrayBuffer, options?: PrintOptions): Promise<void> => {
    return ipcRenderer.invoke('print:pdf', { bufferOrUrl, options });
  },

  printHtml: async (htmlContent: string): Promise<void> => {
    return ipcRenderer.invoke('print:html', htmlContent);
  },

  // Auto-launch
  getAutoLaunchEnabled: async (): Promise<boolean> => {
    return ipcRenderer.invoke('autolaunch:get');
  },

  setAutoLaunchEnabled: async (enabled: boolean): Promise<void> => {
    return ipcRenderer.invoke('autolaunch:set', enabled);
  },

  // Auto-updates
  checkForUpdates: async (): Promise<UpdateCheckResult> => {
    return ipcRenderer.invoke('update:check');
  },

  downloadUpdate: async (): Promise<void> => {
    return ipcRenderer.invoke('update:download');
  },

  installUpdate: async (): Promise<void> => {
    return ipcRenderer.invoke('update:install');
  },

  onUpdateDownloadProgress: (callback: (percent: number) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, percent: number) => {
      callback(percent);
    };
    ipcRenderer.on('update:progress', listener);
    
    return () => {
      ipcRenderer.removeListener('update:progress', listener);
    };
  },

  onUpdateDownloaded: (callback: (info: UpdateInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => {
      callback(info);
    };
    ipcRenderer.on('update:downloaded', listener);
    
    return () => {
      ipcRenderer.removeListener('update:downloaded', listener);
    };
  },

  // App info
  getAppVersion: async (): Promise<string> => {
    return ipcRenderer.invoke('app:version');
  },

  // Sync telemetry (Phase 4)
  syncEvent: (event: SyncEvent): void => {
    ipcRenderer.send('sync:event', event);
  },

  onSyncEvent: (callback: (info: SyncInfo) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: SyncInfo) => {
      callback(info);
    };
    ipcRenderer.on('sync:update', listener);
    
    return () => {
      ipcRenderer.removeListener('sync:update', listener);
    };
  },

  // Diagnostics (Phase 4)
  openDiagnostics: async (): Promise<void> => {
    return ipcRenderer.invoke('diagnostics:open');
  },

  getDiagnosticsState: async (): Promise<DiagnosticsState> => {
    return ipcRenderer.invoke('diagnostics:state');
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log successful preload
console.log('[PRELOAD-V4] Secure IPC bridge established with sync telemetry');
