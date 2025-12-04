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

// Phase 8: Booking event for event journal
export interface BookingEvent {
  type: 'checkin_performed' | 'checkout_performed' | 'checkin_undone' | 'checkout_undone';
  bookingId: string;
  roomId: string;
  timestamp: string;
  payload: any;
}

// Phase 8: Check-in API
export interface OfflineCheckinAPI {
  performCheckIn: (tenantId: string, booking: any) => Promise<{ success: boolean; booking?: any; folio?: any; error?: string }>;
  undoCheckIn: (tenantId: string, bookingId: string) => Promise<{ success: boolean; error?: string }>;
}

// Phase 8: Checkout API
export interface OfflineCheckoutAPI {
  performCheckout: (tenantId: string, bookingId: string, payload: any) => Promise<{ success: boolean; error?: string }>;
  undoCheckout: (tenantId: string, bookingId: string) => Promise<{ success: boolean; error?: string }>;
}

// Phase 8: Offline Data API extensions
export interface OfflineDataAPI {
  bulkUpdateRooms: (tenantId: string, rooms: any[]) => Promise<void>;
  updateRoom: (tenantId: string, room: any) => Promise<void>;
  updateBooking: (tenantId: string, booking: any) => Promise<void>;
  saveBookingEvent: (tenantId: string, event: BookingEvent) => Promise<void>;
  getSnapshot?: (tenantId: string) => Promise<any>;
  // Phase 9: Folio events
  saveFolioEvent?: (tenantId: string, event: FolioEvent) => Promise<void>;
}

// Phase 9: Folio Event for event journal
export interface FolioEvent {
  type: 'folio_created' | 'charge_posted' | 'payment_recorded' | 'transaction_voided' | 'folio_closed';
  folioId: string;
  bookingId: string;
  timestamp: string;
  payload: any;
}

// Phase 10: Housekeeping Event for event journal
export interface HousekeepingEvent {
  type: 
    | 'room_status_updated' 
    | 'maintenance_ticket_created' 
    | 'maintenance_ticket_updated'
    | 'task_created'
    | 'task_updated'
    | 'task_completed'
    | 'checklist_item_completed';
  roomId?: string;
  ticketId?: string;
  taskId?: string;
  staffId?: string;
  timestamp: string;
  payload: any;
}

// Phase 10: Offline Housekeeping API
export interface OfflineHousekeepingAPI {
  updateRoomStatus: (
    tenantId: string,
    roomId: string,
    payload: { status: string; note?: string }
  ) => Promise<{ success: boolean; room?: any; error?: string }>;

  createMaintenanceTicket: (
    tenantId: string,
    payload: any
  ) => Promise<{ success: boolean; ticketId?: string; error?: string }>;

  updateMaintenanceTicket: (
    tenantId: string,
    ticketId: string,
    payload: any
  ) => Promise<{ success: boolean; error?: string }>;

  createTask: (
    tenantId: string,
    payload: any
  ) => Promise<{ success: boolean; taskId?: string; error?: string }>;

  updateTask: (
    tenantId: string,
    taskId: string,
    payload: any
  ) => Promise<{ success: boolean; error?: string }>;

  getSnapshot?: (tenantId: string) => Promise<any>;
}

// Phase 9: Offline Folio API
export interface OfflineFolioAPI {
  createFolio: (tenantId: string, params: any) => Promise<{ success: boolean; folio?: any; error?: string }>;
  getFolio: (tenantId: string, folioId: string) => Promise<any | null>;
  getByBooking: (tenantId: string, bookingId: string) => Promise<any | null>;
  closeFolio: (tenantId: string, folioId: string) => Promise<{ success: boolean; error?: string }>;
  getSnapshot: (tenantId: string, folioId: string) => Promise<any>;
}

// Phase 9: Offline Transaction API
export interface OfflineTransactionAPI {
  postCharge: (tenantId: string, params: any) => Promise<{ success: boolean; transaction?: any; error?: string }>;
  voidTransaction: (tenantId: string, transactionId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  getByFolio: (tenantId: string, folioId: string) => Promise<any[]>;
}

// Phase 9: Offline Payment API
export interface OfflinePaymentAPI {
  recordPayment: (tenantId: string, params: any) => Promise<{ success: boolean; payment?: any; error?: string }>;
  getByFolio: (tenantId: string, folioId: string) => Promise<any[]>;
}

// Phase 9: Offline Balance API
export interface OfflineBalanceAPI {
  getFolioBalance: (tenantId: string, folioId: string) => Promise<{ charges: number; payments: number; balance: number } | null>;
}

// Phase 8 + 9 + 10: Combined Offline API
export interface OfflineAPI {
  checkin: OfflineCheckinAPI;
  checkout: OfflineCheckoutAPI;
  offlineData: OfflineDataAPI;
  sync?: {
    triggerSync: () => Promise<void>;
    getStatus: () => Promise<{ pending: number; syncing: boolean }>;
  };
  // Phase 9: Folio APIs (optional - may not be implemented yet)
  folios?: OfflineFolioAPI;
  transactions?: OfflineTransactionAPI;
  payments?: OfflinePaymentAPI;
  balance?: OfflineBalanceAPI;
  // Phase 10: Housekeeping API (optional - may not be implemented yet)
  housekeeping?: OfflineHousekeepingAPI;
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

  // Phase 8: Offline APIs for check-in/checkout
  offlineApi?: OfflineAPI;
}

/**
 * Augment global Window interface
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
