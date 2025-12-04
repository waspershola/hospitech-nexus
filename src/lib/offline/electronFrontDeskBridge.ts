/**
 * Electron Front Desk Operations Center (FDOC) Bridge
 * PHASE 11: Safe wrappers for Electron offline front desk APIs
 * 
 * All methods return { data, error, source } and NEVER throw.
 * Browser mode returns immediately with no-op results.
 */

import { isElectronContext } from '@/lib/environment/isElectron';

// Result type for all bridge operations
export interface BridgeResult<T> {
  data: T | null;
  error: Error | null;
  source: 'offline' | 'browser' | 'electron-no-api' | 'offline-error';
}

// Front Desk event for event journal
export interface FrontDeskEvent {
  type:
    | 'assign_room'
    | 'change_room'
    | 'extend_stay'
    | 'shorten_stay'
    | 'update_guest_profile'
    | 'post_adjustment'
    | 'post_discount'
    | 'lock_room'
    | 'unlock_room'
    | 'force_close_folio';
  bookingId?: string;
  roomId?: string;
  guestId?: string;
  folioId?: string;
  timestamp: string;
  payload: any;
}

/**
 * Assign room to booking via Electron offline API
 */
export async function offlineAssignRoom(
  tenantId: string,
  bookingId: string,
  roomId: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.assignRoom) {
      console.log('[electronFrontDeskBridge] assignRoom API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.assignRoom(tenantId, bookingId, roomId);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Room assigned offline:', { bookingId, roomId });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline room assignment failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineAssignRoom error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Change room (transfer guest) via Electron offline API
 */
export async function offlineChangeRoom(
  tenantId: string,
  bookingId: string,
  fromRoomId: string,
  toRoomId: string,
  reason?: string
): Promise<BridgeResult<{ success: boolean; newRoomNumber?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.changeRoom) {
      console.log('[electronFrontDeskBridge] changeRoom API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.changeRoom(tenantId, bookingId, fromRoomId, toRoomId, reason);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Room changed offline:', { bookingId, fromRoomId, toRoomId });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline room change failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineChangeRoom error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Extend stay via Electron offline API
 */
export async function offlineExtendStay(
  tenantId: string,
  bookingId: string,
  newCheckOut: string
): Promise<BridgeResult<{ success: boolean; additionalNights?: number }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.extendStay) {
      console.log('[electronFrontDeskBridge] extendStay API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.extendStay(tenantId, bookingId, newCheckOut);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Stay extended offline:', { bookingId, newCheckOut });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline stay extension failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineExtendStay error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Shorten stay via Electron offline API
 */
export async function offlineShortenStay(
  tenantId: string,
  bookingId: string,
  newCheckOut: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.shortenStay) {
      console.log('[electronFrontDeskBridge] shortenStay API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.shortenStay(tenantId, bookingId, newCheckOut);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Stay shortened offline:', { bookingId, newCheckOut });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline stay shortening failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineShortenStay error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Update guest profile via Electron offline API
 */
export async function offlineUpdateGuestProfile(
  tenantId: string,
  guestId: string,
  updates: Record<string, any>
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.updateGuestProfile) {
      console.log('[electronFrontDeskBridge] updateGuestProfile API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.updateGuestProfile(tenantId, guestId, updates);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Guest profile updated offline:', guestId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline guest profile update failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineUpdateGuestProfile error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Post adjustment to folio via Electron offline API
 */
export async function offlinePostAdjustment(
  tenantId: string,
  folioId: string,
  adjustment: { amount: number; description: string; reason?: string }
): Promise<BridgeResult<{ success: boolean; transactionId?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.postAdjustment) {
      console.log('[electronFrontDeskBridge] postAdjustment API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.postAdjustment(tenantId, folioId, adjustment);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Adjustment posted offline:', { folioId, amount: adjustment.amount });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline adjustment posting failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlinePostAdjustment error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Post discount to folio via Electron offline API
 */
export async function offlinePostDiscount(
  tenantId: string,
  folioId: string,
  discount: { amount: number; description: string; reason?: string }
): Promise<BridgeResult<{ success: boolean; transactionId?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.postDiscount) {
      console.log('[electronFrontDeskBridge] postDiscount API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.postDiscount(tenantId, folioId, discount);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Discount posted offline:', { folioId, amount: discount.amount });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline discount posting failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlinePostDiscount error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Lock room via Electron offline API
 */
export async function offlineLockRoom(
  tenantId: string,
  roomId: string,
  reason: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.lockRoom) {
      console.log('[electronFrontDeskBridge] lockRoom API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.lockRoom(tenantId, roomId, reason);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Room locked offline:', { roomId, reason });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline room lock failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineLockRoom error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Unlock room via Electron offline API
 */
export async function offlineUnlockRoom(
  tenantId: string,
  roomId: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.unlockRoom) {
      console.log('[electronFrontDeskBridge] unlockRoom API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.unlockRoom(tenantId, roomId);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Room unlocked offline:', roomId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline room unlock failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineUnlockRoom error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Force close folio via Electron offline API (emergency night audit)
 */
export async function offlineForceCloseFolio(
  tenantId: string,
  folioId: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.frontdesk;
    
    if (!api?.forceCloseFolio) {
      console.log('[electronFrontDeskBridge] forceCloseFolio API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.forceCloseFolio(tenantId, folioId);
    
    if (result?.success) {
      console.log('[electronFrontDeskBridge] Folio force closed offline:', folioId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline folio force close failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronFrontDeskBridge] offlineForceCloseFolio error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Save front desk event to event journal
 */
export async function saveFrontDeskEvent(
  tenantId: string,
  event: FrontDeskEvent
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.offlineData;
    
    // Try dedicated front desk event API first
    if (api?.saveFrontDeskEvent) {
      await api.saveFrontDeskEvent(tenantId, event);
      console.log('[electronFrontDeskBridge] Front desk event saved:', event.type);
      return { data: { success: true }, error: null, source: 'offline' };
    }
    
    // Fallback to generic booking event API (stores in same journal)
    if (api?.saveBookingEvent) {
      await api.saveBookingEvent(tenantId, {
        type: event.type as any,
        bookingId: event.bookingId || 'frontdesk',
        roomId: event.roomId || 'n/a',
        timestamp: event.timestamp,
        payload: event.payload
      });
      console.log('[electronFrontDeskBridge] Front desk event saved via fallback:', event.type);
      return { data: { success: true }, error: null, source: 'offline' };
    }

    console.log('[electronFrontDeskBridge] No event journal API available');
    return { data: null, error: null, source: 'electron-no-api' };
  } catch (err) {
    console.error('[electronFrontDeskBridge] saveFrontDeskEvent error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Failed to save front desk event'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Check if offline front desk API is available
 */
export function isOfflineFrontDeskAvailable(): boolean {
  if (!isElectronContext()) return false;
  
  const api = (window as any).electronAPI?.offlineApi?.frontdesk;
  return !!(api?.assignRoom || api?.changeRoom || api?.extendStay || api?.lockRoom);
}
