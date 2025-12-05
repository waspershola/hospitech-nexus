/**
 * Phase 16: Electron Offline Bridge
 * Unified helper for offline data operations - seeding and reading
 * All functions are safe: never throw, always catch errors and log
 */

import { isElectronContext } from '@/lib/environment/isElectron';

type OfflineStore = 'rooms' | 'bookings' | 'guests' | 'stay_folios' | 'folio_transactions' | 'folio_payments';

/**
 * Safe getter for Electron offline API
 */
export function getElectronOfflineApi() {
  if (!isElectronContext()) return null;
  const api = (window as any).electronAPI;
  if (!api?.offlineApi?.offlineData) return null;
  return api.offlineApi.offlineData;
}

/**
 * Initialize tenant DB (call once after login)
 * Only runs in Electron context when online
 */
export async function initTenantDB(tenantId: string): Promise<void> {
  if (!isElectronContext()) return;
  
  try {
    const api = (window as any).electronAPI;
    if (api?.offlineApi?.offlineData?.initTenantDB) {
      await api.offlineApi.offlineData.initTenantDB(tenantId);
      console.log('[OfflineBridge][initTenantDB] Tenant DB initialized for:', tenantId);
    }
  } catch (e) {
    console.warn('[OfflineBridge][initTenantDB] Failed:', e);
  }
}

/**
 * Bulk save snapshot (seeding when online)
 * Only runs in Electron context when online
 */
export async function bulkSaveSnapshot(
  tenantId: string,
  store: OfflineStore,
  items: any[]
): Promise<void> {
  if (!isElectronContext() || !navigator.onLine) return;
  if (!items || items.length === 0) return;
  
  try {
    const api = (window as any).electronAPI;
    if (api?.offlineApi?.offlineData?.bulkSaveSnapshot) {
      await api.offlineApi.offlineData.bulkSaveSnapshot(tenantId, store, items);
      console.log(`[OfflineBridge][${store}] Seeded ${items.length} items to IndexedDB`);
    }
  } catch (e) {
    console.warn(`[OfflineBridge][${store}] Failed to seed:`, e);
  }
}

/**
 * Get offline rooms from IndexedDB
 * Only runs in Electron context when offline
 */
export async function getOfflineRooms(tenantId: string): Promise<any[]> {
  if (!isElectronContext() || navigator.onLine) return [];
  
  try {
    const api = getElectronOfflineApi();
    if (api?.getRooms) {
      const data = await api.getRooms(tenantId);
      console.log(`[OfflineBridge][rooms] Loaded ${data?.length || 0} rooms from IndexedDB`);
      return data || [];
    }
  } catch (e) {
    console.warn('[OfflineBridge][rooms] Failed to read:', e);
  }
  return [];
}

/**
 * Get offline bookings from IndexedDB
 * Only runs in Electron context when offline
 */
export async function getOfflineBookings(tenantId: string): Promise<any[]> {
  if (!isElectronContext() || navigator.onLine) return [];
  
  try {
    const api = getElectronOfflineApi();
    if (api?.getBookings) {
      const data = await api.getBookings(tenantId);
      console.log(`[OfflineBridge][bookings] Loaded ${data?.length || 0} bookings from IndexedDB`);
      return data || [];
    }
  } catch (e) {
    console.warn('[OfflineBridge][bookings] Failed to read:', e);
  }
  return [];
}

/**
 * Get offline guests from IndexedDB
 * Only runs in Electron context when offline
 */
export async function getOfflineGuests(tenantId: string): Promise<any[]> {
  if (!isElectronContext() || navigator.onLine) return [];
  
  try {
    const api = getElectronOfflineApi();
    if (api?.getGuests) {
      const data = await api.getGuests(tenantId);
      console.log(`[OfflineBridge][guests] Loaded ${data?.length || 0} guests from IndexedDB`);
      return data || [];
    }
  } catch (e) {
    console.warn('[OfflineBridge][guests] Failed to read:', e);
  }
  return [];
}

/**
 * Get offline stay folios from IndexedDB
 * Only runs in Electron context when offline
 */
export async function getOfflineStayFolios(tenantId: string): Promise<any[]> {
  if (!isElectronContext() || navigator.onLine) return [];
  
  try {
    const api = getElectronOfflineApi();
    if (api?.getStayFolios) {
      const data = await api.getStayFolios(tenantId);
      console.log(`[OfflineBridge][stay_folios] Loaded ${data?.length || 0} folios from IndexedDB`);
      return data || [];
    }
  } catch (e) {
    console.warn('[OfflineBridge][stay_folios] Failed to read:', e);
  }
  return [];
}

/**
 * Get offline folio transactions from IndexedDB
 * Only runs in Electron context when offline
 */
export async function getOfflineFolioTransactions(tenantId: string, folioId: string): Promise<any[]> {
  if (!isElectronContext() || navigator.onLine) return [];
  
  try {
    const api = getElectronOfflineApi();
    if (api?.getFolioTransactions) {
      const data = await api.getFolioTransactions(tenantId, folioId);
      console.log(`[OfflineBridge][folio_transactions] Loaded ${data?.length || 0} transactions from IndexedDB`);
      return data || [];
    }
  } catch (e) {
    console.warn('[OfflineBridge][folio_transactions] Failed to read:', e);
  }
  return [];
}

/**
 * Get offline folio payments from IndexedDB
 * Only runs in Electron context when offline
 */
export async function getOfflineFolioPayments(tenantId: string, folioId: string): Promise<any[]> {
  if (!isElectronContext() || navigator.onLine) return [];
  
  try {
    const api = getElectronOfflineApi();
    if (api?.getFolioPayments) {
      const data = await api.getFolioPayments(tenantId, folioId);
      console.log(`[OfflineBridge][folio_payments] Loaded ${data?.length || 0} payments from IndexedDB`);
      return data || [];
    }
  } catch (e) {
    console.warn('[OfflineBridge][folio_payments] Failed to read:', e);
  }
  return [];
}
