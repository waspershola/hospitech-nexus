/**
 * Electron Check-In/Checkout Bridge
 * PHASE 8: Safe wrappers for Electron offline check-in/checkout APIs
 * 
 * All methods return { data, error } and NEVER throw.
 * Browser mode returns immediately with no-op results.
 */

import { isElectronContext } from '@/lib/environment/isElectron';

// Result type for all bridge operations
export interface BridgeResult<T> {
  data: T | null;
  error: Error | null;
  source: 'offline' | 'browser' | 'electron-no-api' | 'offline-error';
}

// Check-in result from Electron
export interface OfflineCheckInResult {
  success: boolean;
  booking?: any;
  folio?: any;
  error?: string;
}

// Checkout result from Electron
export interface OfflineCheckoutResult {
  success: boolean;
  error?: string;
}

// Booking event for event journal
export interface BookingEvent {
  type: 'checkin_performed' | 'checkout_performed' | 'checkin_undone' | 'checkout_undone';
  bookingId: string;
  roomId: string;
  timestamp: string;
  payload: any;
}

/**
 * Perform offline check-in via Electron API
 * Returns immediately in browser mode
 */
export async function offlineCheckIn(
  tenantId: string,
  booking: any
): Promise<BridgeResult<OfflineCheckInResult>> {
  // Guard: Not in Electron context
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.checkin;
    
    if (!api?.performCheckIn) {
      console.log('[electronCheckinCheckoutBridge] Check-in API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.performCheckIn(tenantId, booking);
    
    if (result?.success) {
      console.log('[electronCheckinCheckoutBridge] Offline check-in succeeded:', { bookingId: booking.id });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline check-in failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronCheckinCheckoutBridge] offlineCheckIn error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown offline check-in error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Undo offline check-in via Electron API
 */
export async function offlineUndoCheckIn(
  tenantId: string,
  bookingId: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.checkin;
    
    if (!api?.undoCheckIn) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.undoCheckIn(tenantId, bookingId);
    
    if (result?.success) {
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline undo check-in failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronCheckinCheckoutBridge] offlineUndoCheckIn error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Perform offline checkout via Electron API
 */
export async function offlineCheckout(
  tenantId: string,
  bookingId: string,
  payload: { autoChargeToWallet?: boolean; roomId?: string; folioId?: string }
): Promise<BridgeResult<OfflineCheckoutResult>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.checkout;
    
    if (!api?.performCheckout) {
      console.log('[electronCheckinCheckoutBridge] Checkout API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.performCheckout(tenantId, bookingId, payload);
    
    if (result?.success) {
      console.log('[electronCheckinCheckoutBridge] Offline checkout succeeded:', { bookingId });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline checkout failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronCheckinCheckoutBridge] offlineCheckout error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown offline checkout error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Undo offline checkout via Electron API
 */
export async function offlineUndoCheckout(
  tenantId: string,
  bookingId: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.checkout;
    
    if (!api?.undoCheckout) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.undoCheckout(tenantId, bookingId);
    
    if (result?.success) {
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline undo checkout failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronCheckinCheckoutBridge] offlineUndoCheckout error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Save a booking event to the event journal
 * Used for offline audit trail
 */
export async function saveBookingEvent(
  tenantId: string,
  event: BookingEvent
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.offlineData;
    
    if (!api?.saveBookingEvent) {
      console.log('[electronCheckinCheckoutBridge] saveBookingEvent API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    await api.saveBookingEvent(tenantId, event);
    console.log('[electronCheckinCheckoutBridge] Booking event saved:', event.type);
    return { data: { success: true }, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronCheckinCheckoutBridge] saveBookingEvent error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Failed to save booking event'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Update booking in offline cache
 */
export async function updateBookingCache(
  tenantId: string,
  booking: any
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.offlineData;
    
    if (!api?.updateBooking) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    await api.updateBooking(tenantId, booking);
    console.log('[electronCheckinCheckoutBridge] Booking cache updated:', booking.id);
    return { data: { success: true }, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronCheckinCheckoutBridge] updateBookingCache error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Failed to update booking cache'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Update room in offline cache
 */
export async function updateRoomCache(
  tenantId: string,
  room: any
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.offlineData;
    
    if (!api?.updateRoom) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    await api.updateRoom(tenantId, room);
    console.log('[electronCheckinCheckoutBridge] Room cache updated:', room.id);
    return { data: { success: true }, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronCheckinCheckoutBridge] updateRoomCache error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Failed to update room cache'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Check if offline check-in/checkout APIs are available
 */
export function isOfflineCheckinCheckoutAvailable(): boolean {
  if (!isElectronContext()) return false;
  
  const api = (window as any).electronAPI?.offlineApi;
  return !!(api?.checkin?.performCheckIn || api?.checkout?.performCheckout);
}
