/**
 * Electron POS & QR Bridge - Phase 13
 * Safe wrappers for offline POS orders, menu items, and guest request operations.
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

// ============================================
// POS EVENT TYPES
// ============================================

export interface POSEvent {
  type:
    | 'order_created'
    | 'order_updated'
    | 'order_submitted'
    | 'order_cancelled'
    | 'item_added'
    | 'item_removed'
    | 'quantity_changed';
  orderId: string;
  roomId?: string;
  guestId?: string;
  qrToken?: string;
  timestamp: string;
  payload: any;
}

export interface RequestEvent {
  type:
    | 'request_created'
    | 'request_status_updated'
    | 'request_assigned'
    | 'request_note_added'
    | 'request_completed';
  requestId: string;
  roomId?: string;
  qrToken?: string;
  staffId?: string;
  timestamp: string;
  payload: any;
}

// ============================================
// MENU OPERATIONS
// ============================================

export async function offlineGetMenuItems(
  tenantId: string
): Promise<BridgeResult<any[]>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.pos;
    if (!api?.getMenuItems) {
      console.log('[electronPOSAndQRBridge] PHASE-13 POS API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getMenuItems(tenantId);
    console.log('[electronPOSAndQRBridge] PHASE-13 Got offline menu items:', result?.length);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineGetMenuItems error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineGetMenuCategories(
  tenantId: string
): Promise<BridgeResult<string[]>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.pos;
    if (!api?.getMenuCategories) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getMenuCategories(tenantId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineGetMenuCategories error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// ORDER OPERATIONS
// ============================================

export interface CreateOrderPayload {
  qr_token: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
  }>;
  guest_name?: string;
  room_id?: string;
  special_instructions?: string;
}

export async function offlineCreateOrder(
  tenantId: string,
  payload: CreateOrderPayload
): Promise<BridgeResult<{ success: boolean; orderId?: string; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.pos;
    if (!api?.createOrder) {
      console.log('[electronPOSAndQRBridge] PHASE-13 createOrder not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.createOrder(tenantId, payload);
    console.log('[electronPOSAndQRBridge] PHASE-13 Order created offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineCreateOrder error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineUpdateOrder(
  tenantId: string,
  orderId: string,
  payload: any
): Promise<BridgeResult<{ success: boolean; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.pos;
    if (!api?.updateOrder) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.updateOrder(tenantId, orderId, payload);
    console.log('[electronPOSAndQRBridge] PHASE-13 Order updated offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineUpdateOrder error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineSubmitOrder(
  tenantId: string,
  orderId: string
): Promise<BridgeResult<{ success: boolean; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.pos;
    if (!api?.submitOrder) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.submitOrder(tenantId, orderId);
    console.log('[electronPOSAndQRBridge] PHASE-13 Order submitted offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineSubmitOrder error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineCancelOrder(
  tenantId: string,
  orderId: string,
  reason: string
): Promise<BridgeResult<{ success: boolean; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.pos;
    if (!api?.cancelOrder) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.cancelOrder(tenantId, orderId, reason);
    console.log('[electronPOSAndQRBridge] PHASE-13 Order cancelled offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineCancelOrder error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineGetOrderSnapshot(
  tenantId: string,
  orderId: string
): Promise<BridgeResult<any>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.pos;
    if (!api?.getSnapshot) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getSnapshot(tenantId, orderId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineGetOrderSnapshot error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// GUEST REQUEST OPERATIONS
// ============================================

export interface CreateRequestPayload {
  qr_token: string;
  type: string;
  note?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  guest_name?: string;
  guest_contact?: string;
  guest_session_token?: string;
}

export async function offlineCreateRequest(
  tenantId: string,
  payload: CreateRequestPayload
): Promise<BridgeResult<{ success: boolean; requestId?: string; request?: any; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.requests;
    if (!api?.createRequest) {
      console.log('[electronPOSAndQRBridge] PHASE-13 requests API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.createRequest(tenantId, payload);
    console.log('[electronPOSAndQRBridge] PHASE-13 Request created offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineCreateRequest error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineUpdateRequestStatus(
  tenantId: string,
  requestId: string,
  status: string
): Promise<BridgeResult<{ success: boolean; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.requests;
    if (!api?.updateStatus) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.updateStatus(tenantId, requestId, status);
    console.log('[electronPOSAndQRBridge] PHASE-13 Request status updated offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineUpdateRequestStatus error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineAssignRequest(
  tenantId: string,
  requestId: string,
  staffId: string
): Promise<BridgeResult<{ success: boolean; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.requests;
    if (!api?.assignRequest) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.assignRequest(tenantId, requestId, staffId);
    console.log('[electronPOSAndQRBridge] PHASE-13 Request assigned offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineAssignRequest error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function offlineAddRequestNote(
  tenantId: string,
  requestId: string,
  note: string
): Promise<BridgeResult<{ success: boolean; error?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.requests;
    if (!api?.addNote) {
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.addNote(tenantId, requestId, note);
    console.log('[electronPOSAndQRBridge] PHASE-13 Note added offline:', result);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] offlineAddRequestNote error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// EVENT JOURNAL
// ============================================

export async function savePosEvent(
  tenantId: string,
  event: POSEvent
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.offlineData;
    if (!api?.savePosEvent) {
      // Fallback: log event but don't fail
      console.log('[electronPOSAndQRBridge] PHASE-13 savePosEvent not available, event logged:', event.type);
      return { data: { success: true }, error: null, source: 'electron-no-api' };
    }

    await api.savePosEvent(tenantId, event);
    console.log('[electronPOSAndQRBridge] PHASE-13 POS event saved:', event.type);
    return { data: { success: true }, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] savePosEvent error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

export async function saveRequestEvent(
  tenantId: string,
  event: RequestEvent
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = window.electronAPI?.offlineApi?.offlineData;
    if (!api?.saveRequestEvent) {
      // Fallback: log event but don't fail
      console.log('[electronPOSAndQRBridge] PHASE-13 saveRequestEvent not available, event logged:', event.type);
      return { data: { success: true }, error: null, source: 'electron-no-api' };
    }

    await api.saveRequestEvent(tenantId, event);
    console.log('[electronPOSAndQRBridge] PHASE-13 Request event saved:', event.type);
    return { data: { success: true }, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronPOSAndQRBridge] saveRequestEvent error:', err);
    return { data: null, error: err as Error, source: 'offline' };
  }
}

// ============================================
// UTILITY
// ============================================

export function isOfflinePOSApiAvailable(): boolean {
  return isElectronContext() && !!window.electronAPI?.offlineApi?.pos;
}

export function isOfflineRequestsApiAvailable(): boolean {
  return isElectronContext() && !!window.electronAPI?.offlineApi?.requests;
}
