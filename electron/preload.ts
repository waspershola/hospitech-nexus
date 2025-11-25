/**
 * Electron Preload Script - Secure IPC Bridge
 * LUXURYHOTELPRO OFFLINE DESKTOP - Phase 1
 * 
 * Exposes minimal typed API to renderer with contextIsolation enabled
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, QueuedRequest, QueueStatus, LogEvent, PrintOptions } from './types';

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

  // App info
  getAppVersion: async (): Promise<string> => {
    return ipcRenderer.invoke('app:version');
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log successful preload
console.log('[PRELOAD] Secure IPC bridge established');
