/**
 * Offline Data Service - Phase 2
 * Provides getCachedOrFetch utility for all data hooks
 * OFFLINE-DATA-SERVICE-V1
 */

import { tenantDBManager } from './tenantDBManager';
import type { TenantDB, CachedRoom, CachedBooking, CachedQRRequest } from './offlineTypes';

/**
 * Check if network is offline using unified state
 */
export function isNetworkOffline(): boolean {
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
    console.log(`[OfflineDataService] OFFLINE-V1: Loading ${String(storeName)} from cache`);
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
 */
export async function updateCache<T extends { id: string }>(
  tenantId: string,
  storeName: keyof TenantDB,
  items: T[]
): Promise<void> {
  if (!items?.length) return;
  
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const tx = db.transaction(storeName as any, 'readwrite');
    const store = tx.objectStore(storeName as any);
    
    const cachedAt = Date.now();
    
    for (const item of items) {
      await store.put({ ...item, tenant_id: tenantId, cached_at: cachedAt } as any);
    }
    
    await tx.done;
    console.log(`[OfflineDataService] Cached ${items.length} items to ${String(storeName)}`);
  } catch (err) {
    console.error(`[OfflineDataService] Cache update error:`, err);
    throw err;
  }
}

/**
 * Get cached rooms for tenant
 */
export async function getCachedRooms(tenantId: string): Promise<CachedRoom[]> {
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
  try {
    const db = await tenantDBManager.openTenantDB(tenantId);
    await db.clear(storeName as any);
    console.log(`[OfflineDataService] Cleared cache for ${String(storeName)}`);
  } catch (err) {
    console.error('[OfflineDataService] Cache invalidation error:', err);
  }
}
