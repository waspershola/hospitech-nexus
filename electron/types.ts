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

export interface SyncEvent {
  type: 'start' | 'complete' | 'error';
  queued?: number;
  synced?: number;
  failed?: number;
  error?: string;
  timestamp?: number;
}

export interface SyncInfo {
  status: 'idle' | 'syncing' | 'error';
  queued: number;
  synced: number;
  failed: number;
  lastSyncAt: number | null;
  error?: string;
}

export interface DiagnosticsState {
  network: {
    isOnline: boolean;
    lastChangeAt: number | null;
  };
  sync: SyncInfo;
  logs: LogEvent[];
}

export interface PrintOptions {
  silent?: boolean;
  deviceName?: string;
  copies?: number;
}

/**
 * Typed Electron API exposed to renderer via preload bridge
 */
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
}

export interface UpdateCheckResult {
  available: boolean;
  info: UpdateInfo | null;
}

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

  // Auto-updates
  checkForUpdates: () => Promise<UpdateCheckResult>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateDownloadProgress?: (callback: (percent: number) => void) => () => void;
  onUpdateDownloaded?: (callback: (info: UpdateInfo) => void) => () => void;

  // App info
  getAppVersion: () => Promise<string>;

  // Sync telemetry (Phase 4)
  syncEvent: (event: SyncEvent) => void;
  onSyncEvent: (callback: (info: SyncInfo) => void) => () => void;

  // Diagnostics (Phase 4)
  openDiagnostics: () => Promise<void>;
  getDiagnosticsState: () => Promise<DiagnosticsState>;
}

/**
 * Augment global Window interface
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
