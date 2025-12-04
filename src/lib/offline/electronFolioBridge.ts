/**
 * Electron Folio Bridge - Phase 9
 * Safe wrappers for offline folio, transaction, and payment operations.
 * All functions return BridgeResult and never throw exceptions.
 * Browser mode returns no-op results immediately.
 */

import { isElectronContext } from '@/lib/environment/isElectron';

// Re-export for convenience
export { isElectronContext };

export interface BridgeResult<T> {
  data: T | null;
  error: Error | null;
  source: 'offline' | 'browser' | 'electron-no-api';
}

export interface FolioEvent {
  type: 'folio_created' | 'charge_posted' | 'payment_recorded' | 'transaction_voided' | 'folio_closed';
  folioId: string;
  bookingId: string;
  timestamp: string;
  payload: any;
}

export interface OfflineFolioBalance {
  charges: number;
  payments: number;
  balance: number;
}

export interface OfflineChargeParams {
  folioId: string;
  amount: number;
  description: string;
  department?: string;
  metadata?: Record<string, any>;
}

export interface OfflinePaymentParams {
  bookingId: string;
  folioId: string;
  guestId: string;
  guestName: string;
  amount: number;
  paymentMethod: string;
  providerId?: string;
  providerName?: string;
  locationId?: string;
  locationName?: string;
  metadata?: Record<string, any>;
}

// ============================================
// FOLIO OPERATIONS
// ============================================

export async function offlineCreateFolio(
  tenantId: string,
  params: { bookingId: string; guestId: string; roomId: string }
): Promise<BridgeResult<{ success: boolean; folio?: any }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.folios;
    if (!api?.createFolio) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.createFolio(tenantId, params);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineCreateFolio error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineGetFolio(
  tenantId: string,
  folioId: string
): Promise<BridgeResult<any>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.folios;
    if (!api?.getFolio) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getFolio(tenantId, folioId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineGetFolio error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineGetFolioByBooking(
  tenantId: string,
  bookingId: string
): Promise<BridgeResult<any>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.folios;
    if (!api?.getByBooking) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getByBooking(tenantId, bookingId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineGetFolioByBooking error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineGetFolioSnapshot(
  tenantId: string,
  folioId: string
): Promise<BridgeResult<any>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.folios;
    if (!api?.getSnapshot) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getSnapshot(tenantId, folioId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineGetFolioSnapshot error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineCloseFolio(
  tenantId: string,
  folioId: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.folios;
    if (!api?.closeFolio) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.closeFolio(tenantId, folioId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineCloseFolio error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// TRANSACTION OPERATIONS
// ============================================

export async function offlinePostCharge(
  tenantId: string,
  params: OfflineChargeParams
): Promise<BridgeResult<{ success: boolean; transaction?: any }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.transactions;
    if (!api?.postCharge) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.postCharge(tenantId, params);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlinePostCharge error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineVoidTransaction(
  tenantId: string,
  transactionId: string,
  reason: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.transactions;
    if (!api?.voidTransaction) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.voidTransaction(tenantId, transactionId, reason);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineVoidTransaction error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineGetFolioTransactions(
  tenantId: string,
  folioId: string
): Promise<BridgeResult<any[]>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.transactions;
    if (!api?.getByFolio) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getByFolio(tenantId, folioId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineGetFolioTransactions error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// PAYMENT OPERATIONS
// ============================================

export async function offlineRecordPayment(
  tenantId: string,
  params: OfflinePaymentParams
): Promise<BridgeResult<{ success: boolean; payment?: any }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.payments;
    if (!api?.recordPayment) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.recordPayment(tenantId, params);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineRecordPayment error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineGetFolioPayments(
  tenantId: string,
  folioId: string
): Promise<BridgeResult<any[]>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.payments;
    if (!api?.getByFolio) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getByFolio(tenantId, folioId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineGetFolioPayments error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// BALANCE OPERATIONS
// ============================================

export async function offlineGetFolioBalance(
  tenantId: string,
  folioId: string
): Promise<BridgeResult<OfflineFolioBalance>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.balance;
    if (!api?.getFolioBalance) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getFolioBalance(tenantId, folioId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] offlineGetFolioBalance error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// EVENT JOURNAL
// ============================================

export async function saveFolioEvent(
  tenantId: string,
  event: FolioEvent
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.offlineData;
    if (!api?.saveFolioEvent) {
      // Fallback to booking event journal if folio-specific not available
      const saveBookingEvent = window.electronAPI?.offlineApi?.offlineData?.saveBookingEvent;
      if (saveBookingEvent) {
        await saveBookingEvent(tenantId, {
          type: event.type as any,
          bookingId: event.bookingId,
          roomId: '',
          timestamp: event.timestamp,
          payload: { ...event.payload, folioId: event.folioId },
        });
        return { data: { success: true }, error: null, source: 'offline' };
      }
      return { data: null, error: null, source: 'electron-no-api' };
    }

    await api.saveFolioEvent(tenantId, event);
    return { data: { success: true }, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronFolioBridge] saveFolioEvent error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// UTILITY
// ============================================

export function isOfflineFolioApiAvailable(): boolean {
  return isElectronContext() && !!window.electronAPI?.offlineApi?.folios;
}

export function isOfflineTransactionApiAvailable(): boolean {
  return isElectronContext() && !!window.electronAPI?.offlineApi?.transactions;
}

export function isOfflinePaymentApiAvailable(): boolean {
  return isElectronContext() && !!window.electronAPI?.offlineApi?.payments;
}
