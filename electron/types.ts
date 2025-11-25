/**
 * Shared TypeScript types for Electron IPC communication
 * LUXURYHOTELPRO OFFLINE DESKTOP - Phase 1
 */

export type OfflineMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueuedRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  url: string;
  method: OfflineMethod;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  origin: 'desktop-offline';
}

export interface QueueStatus {
  pending: number;
  failed: number;
  syncing: boolean;
  lastSyncAt: number | null;
}

export interface LogEvent {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  timestamp: number;
}

export interface PrintOptions {
  silent?: boolean;
  deviceName?: string;
  copies?: number;
}

/**
 * Typed Electron API exposed to renderer via preload bridge
 */
export interface ElectronAPI {
  // Desktop detection
  isDesktop: boolean;

  // Offline queue
  queueRequest: (req: QueuedRequest) => Promise<void>;
  getQueueStatus: () => Promise<QueueStatus>;

  // Connectivity
  onOnlineStatusChange: (callback: (isOnline: boolean) => void) => () => void;

  // Logging
  log: (event: LogEvent) => void;

  // Printing
  printPdf: (bufferOrUrl: string | ArrayBuffer, options?: PrintOptions) => Promise<void>;
  printHtml: (htmlContent: string) => Promise<void>;

  // Auto-launch
  getAutoLaunchEnabled: () => Promise<boolean>;
  setAutoLaunchEnabled: (enabled: boolean) => Promise<void>;

  // App info
  getAppVersion: () => Promise<string>;
}

/**
 * Augment global Window interface
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
