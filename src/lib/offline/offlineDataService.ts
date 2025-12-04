/**
 * Offline Data Service - Phase 3C
 * Provides getCachedOrFetch utility for all data hooks
 * OFFLINE-EXTREME-V1
 */

import { tenantDBManager } from './tenantDBManager';
import type { 
  TenantDB, 
  CachedRoom, 
  CachedBooking, 
  CachedQRRequest,
  CachedFolio,
  CachedKPI,
  CachedNightAuditSnapshot,
  SyncMetadata,
  OFFLINE_SCHEMA_VERSION 
} from './offlineTypes';
import { isElectronContext } from './offlineTypes';

const DEBUG_OFFLINE = import.meta.env.DEV && false;

/**
 * Check if network is offline using unified state
 * ELECTRON-ONLY-V1: Web SPA always returns false - no offline engine in browser
 */
export function isNetworkOffline(): boolean {
  // Web SPA: Never use offline engine - always return false
  if (!isElectronContext()) {
    return false;
  }
  
  if (typeof window === 'undefined') return false;
  
  if ((window as any).__HARD_OFFLINE__ === true) return true;
  
  const state = (window as any).__NETWORK_STATE__;
  if (state?.hardOffline === true) return true;
  if (state?.online === false) return true;
  
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  
  return false;
}

/**
 * Generic cache-or-fetch utility
 * If offline: returns cached data from IndexedDB
 * If online: fetches fresh, updates cache, returns data
 */
export async function getCachedOrFetch<T>(
  tenantId: string,
  storeName: keyof TenantDB,
  fetcher: () => Promise<T[]>,
  filterFn?: (item: T) => boolean
): Promise<T[]> {
  if (isNetworkOffline()) {
    if (DEBUG_OFFLINE) console.log(`[OfflineDataService] OFFLINE-V1: Loading ${String(storeName)} from cache`);
    try {
      const db = await tenantDBManager.openTenantDB(tenantId);
      let items = await db.getAll(storeName as any) as unknown as T[];
      if (filterFn) {
        items = items.filter(filterFn);
      }
      return items;
    } catch (err) {
      console.error(`[OfflineDataService] Cache read error for ${String(storeName)}:`, err);
      return [];
    }
  }

  // Online path: fetch fresh data
  const data = await fetcher();
  
  // Update cache in background (non-blocking)
  updateCache(tenantId, storeName, data as any[]).catch(err => {
    console.warn(`[OfflineDataService] Cache update failed for ${String(storeName)}:`, err);
  });
  
  return data;
}

/**
 * Bulk update cache for entity
 * OFFLINE-EXTREME-V1: Added sync metadata fields
 */
export async function updateCache<T extends { id: string }>(
  tenantId: string,
  storeName: keyof TenantDB,
  items: T[]
): Promise<void> {
  if (!isElectronContext()) return; // SPA: no-op
  if (!items?.length) return;
  
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const tx = db.transaction(storeName as any, 'readwrite');
    const store = tx.objectStore(storeName as any);
    
    const now = Date.now();
    
    for (const item of items) {
      await store.put({ 
        ...item, 
        tenant_id: tenantId, 
        cached_at: now,
        last_synced_at: now,
        schema_version: 2,
        sync_status: 'fresh',
      } as any);
    }
    
    await tx.done;
    
    // Update sync metadata
    await tenantDBManager.updateSyncMetadata(tenantId, String(storeName), true, items.length);
    
    if (DEBUG_OFFLINE) console.log(`[OfflineDataService] Cached ${items.length} items to ${String(storeName)}`);
  } catch (err) {
    console.error(`[OfflineDataService] Cache update error:`, err);
    throw err;
  }
}

/**
 * Get cached rooms for tenant
 */
export async function getCachedRooms(tenantId: string): Promise<CachedRoom[]> {
  if (!isElectronContext()) return [];
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    return await db.getAll('rooms');
  } catch (err) {
    console.error('[OfflineDataService] getCachedRooms error:', err);
    return [];
  }
}

/**
 * Get single cached room
 */
export async function getCachedRoom(tenantId: string, roomId: string): Promise<CachedRoom | null> {
  if (!isElectronContext()) return null;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const room = await db.get('rooms', roomId);
    return room || null;
  } catch (err) {
    console.error('[OfflineDataService] getCachedRoom error:', err);
    return null;
  }
}

/**
 * Get cached bookings filtered by date range
 */
export async function getCachedBookings(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<CachedBooking[]> {
  if (!isElectronContext()) return [];
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    let bookings = await db.getAll('bookings');
    
    if (startDate && endDate) {
      bookings = bookings.filter(b => {
        const checkIn = b.check_in.split('T')[0];
        const checkOut = b.check_out.split('T')[0];
        // Overlap: check_in <= endDate AND check_out > startDate
        return checkIn <= endDate && checkOut > startDate;
      });
    }
    
    return bookings;
  } catch (err) {
    console.error('[OfflineDataService] getCachedBookings error:', err);
    return [];
  }
}

/**
 * Get cached bookings for a specific room
 */
export async function getCachedBookingsForRoom(
  tenantId: string,
  roomId: string
): Promise<CachedBooking[]> {
  if (!isElectronContext()) return [];
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    return await db.getAllFromIndex('bookings', 'by-room', roomId);
  } catch (err) {
    console.error('[OfflineDataService] getCachedBookingsForRoom error:', err);
    return [];
  }
}

/**
 * Get cached QR requests
 */
export async function getCachedQRRequests(tenantId: string): Promise<CachedQRRequest[]> {
  if (!isElectronContext()) return [];
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    return await db.getAll('qr_requests');
  } catch (err) {
    console.error('[OfflineDataService] getCachedQRRequests error:', err);
    return [];
  }
}

/**
 * Get cached guests
 */
export async function getCachedGuests(tenantId: string) {
  if (!isElectronContext()) return [];
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    return await db.getAll('guests');
  } catch (err) {
    console.error('[OfflineDataService] getCachedGuests error:', err);
    return [];
  }
}

/**
 * Get first cached item matching filter
 * OFFLINE-PHASE2-V1: Helper for single item lookups
 */
export async function getCachedFirst<T>(
  tenantId: string,
  storeName: keyof TenantDB,
  matchFn: (item: T) => boolean
): Promise<T | null> {
  if (!isElectronContext()) return null;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const items = await db.getAll(storeName as any) as unknown as T[];
    return items.find(matchFn) || null;
  } catch (err) {
    console.error(`[OfflineDataService] getCachedFirst error for ${String(storeName)}:`, err);
    return null;
  }
}

/**
 * Invalidate cache for entity
 */
export async function invalidateCache(
  tenantId: string,
  storeName: keyof TenantDB
): Promise<void> {
  if (!isElectronContext()) return;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    await db.clear(storeName as any);
    if (DEBUG_OFFLINE) console.log(`[OfflineDataService] Cleared cache for ${String(storeName)}`);
  } catch (err) {
    console.error('[OfflineDataService] Cache invalidation error:', err);
  }
}

// ============= KPI CACHING - OFFLINE-EXTREME-V1 =============

/**
 * Get cached Front Desk KPIs for a specific date
 */
export async function getCachedFrontDeskKPIs(
  tenantId: string, 
  dateKey: string
): Promise<CachedKPI | null> {
  if (!isElectronContext()) return null;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const id = `${tenantId}_${dateKey}`;
    const kpi = await db.get('kpi_snapshots', id);
    return kpi || null;
  } catch (err) {
    console.error('[OfflineDataService] getCachedFrontDeskKPIs error:', err);
    return null;
  }
}

/**
 * Cache Front Desk KPIs
 */
export async function cacheFrontDeskKPIs(
  tenantId: string,
  dateKey: string,
  kpiData: Omit<CachedKPI, 'id' | 'tenant_id' | 'date_key' | 'cached_at' | 'last_synced_at' | 'schema_version'>
): Promise<void> {
  if (!isElectronContext()) return;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const now = Date.now();
    const kpi: CachedKPI = {
      id: `${tenantId}_${dateKey}`,
      tenant_id: tenantId,
      date_key: dateKey,
      ...kpiData,
      cached_at: now,
      last_synced_at: now,
      schema_version: 2,
    };
    await db.put('kpi_snapshots', kpi);
    if (DEBUG_OFFLINE) console.log(`[OfflineDataService] Cached KPIs for ${dateKey}`);
  } catch (err) {
    console.error('[OfflineDataService] cacheFrontDeskKPIs error:', err);
  }
}

// ============= FOLIO CACHING - OFFLINE-EXTREME-V1 =============

/**
 * Get cached folio for a booking
 */
export async function getCachedFolio(
  tenantId: string,
  bookingId: string
): Promise<CachedFolio | null> {
  if (!isElectronContext()) return null;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const folios = await db.getAllFromIndex('folios', 'by-booking', bookingId);
    // Return the primary room folio (prefer open, then first)
    const openFolio = folios.find(f => f.status === 'open' && f.folio_type === 'room');
    return openFolio || folios[0] || null;
  } catch (err) {
    console.error('[OfflineDataService] getCachedFolio error:', err);
    return null;
  }
}

/**
 * Cache folio data
 */
export async function cacheFolio(
  tenantId: string,
  folioData: Omit<CachedFolio, 'tenant_id' | 'cached_at' | 'last_synced_at' | 'schema_version' | 'sync_status'>
): Promise<void> {
  if (!isElectronContext()) return;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const now = Date.now();
    const folio: CachedFolio = {
      ...folioData,
      tenant_id: tenantId,
      cached_at: now,
      last_synced_at: now,
      schema_version: 2,
      sync_status: 'fresh',
    };
    await db.put('folios', folio);
    if (DEBUG_OFFLINE) console.log(`[OfflineDataService] Cached folio ${folioData.id}`);
  } catch (err) {
    console.error('[OfflineDataService] cacheFolio error:', err);
  }
}

// ============= NIGHT AUDIT SNAPSHOTS - OFFLINE-EXTREME-V1 =============

/**
 * Get cached Night Audit snapshot for a business date
 */
export async function getCachedNightAuditSnapshot(
  tenantId: string,
  businessDate: string
): Promise<CachedNightAuditSnapshot | null> {
  if (!isElectronContext()) return null;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const id = `${tenantId}_${businessDate}`;
    const snapshot = await db.get('night_audit_snapshots', id);
    return snapshot || null;
  } catch (err) {
    console.error('[OfflineDataService] getCachedNightAuditSnapshot error:', err);
    return null;
  }
}

/**
 * Cache Night Audit snapshot
 */
export async function cacheNightAuditSnapshot(
  tenantId: string,
  businessDate: string,
  snapshotData: Omit<CachedNightAuditSnapshot, 'id' | 'tenant_id' | 'business_date' | 'cached_at' | 'last_synced_at' | 'schema_version'>
): Promise<void> {
  if (!isElectronContext()) return;
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const now = Date.now();
    const snapshot: CachedNightAuditSnapshot = {
      id: `${tenantId}_${businessDate}`,
      tenant_id: tenantId,
      business_date: businessDate,
      ...snapshotData,
      cached_at: now,
      last_synced_at: now,
      schema_version: 2,
    };
    await db.put('night_audit_snapshots', snapshot);
    if (DEBUG_OFFLINE) console.log(`[OfflineDataService] Cached Night Audit snapshot for ${businessDate}`);
  } catch (err) {
    console.error('[OfflineDataService] cacheNightAuditSnapshot error:', err);
  }
}

// ============= SYNC METADATA HELPERS - OFFLINE-EXTREME-V1 =============

/**
 * Get sync metadata for an entity
 */
export async function getSyncMetadata(
  tenantId: string,
  entity: string
): Promise<SyncMetadata | null> {
  if (!isElectronContext()) return null;
  return tenantDBManager.getSyncMetadata(tenantId, entity);
}

/**
 * Get last sync time for an entity
 */
export async function getLastSyncTime(
  tenantId: string,
  entity: string
): Promise<number | null> {
  const metadata = await getSyncMetadata(tenantId, entity);
  return metadata?.last_sync_at || null;
}

/**
 * Calculate relative time string for display
 */
export function formatRelativeSyncTime(lastSyncAt: number | null): string {
  if (!lastSyncAt) return 'Never synced';
  
  const now = Date.now();
  const diffMs = now - lastSyncAt;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
