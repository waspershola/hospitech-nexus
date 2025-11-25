/**
 * Offline Queue - Phase 2 (Refactored)
 * Multi-tenant queue with per-tenant database isolation
 */

import { tenantDBManager } from './tenantDBManager';
import { sessionManager } from './sessionManager';
import { isElectronContext, getElectronAPI } from './offlineTypes';
import type { OfflineQueueItem } from './offlineTypes';
import type { QueuedRequest } from '../../../electron/types';

/**
 * Queue a request for offline sync
 */
export async function queueOfflineRequest(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  payload: any
): Promise<string> {
  const tenantId = sessionManager.getTenantId();
  const userId = sessionManager.getUserId();

  if (!tenantId || !userId) {
    throw new Error('No active session - cannot queue request');
  }

  const requestId = crypto.randomUUID();
  
  const queueItem: OfflineQueueItem = {
    id: requestId,
    tenant_id: tenantId,
    user_id: userId,
    url,
    method,
    payload,
    timestamp: Date.now(),
    retries: 0,
    maxRetries: 5,
    origin: 'desktop-offline',
    created_at: new Date().toISOString(),
    status: 'pending',
  };

  // If running in Electron, also notify main process
  if (isElectronContext()) {
    const electronAPI = getElectronAPI();
    await electronAPI?.queueRequest(queueItem);
  }

  const db = await tenantDBManager.openTenantDB(tenantId);
  await db.put('offline_queue', queueItem);

  console.log(`[OfflineQueue] Queued ${method} ${url} for tenant ${tenantId}`);
  return requestId;
}

/**
 * Get all pending queue items for current tenant
 */
export async function getPendingQueueItems(): Promise<OfflineQueueItem[]> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) return [];

  const db = await tenantDBManager.openTenantDB(tenantId);
  return db.getAllFromIndex('offline_queue', 'by-status', 'pending');
}

/**
 * Get failed queue items for current tenant
 */
export async function getFailedQueueItems(): Promise<OfflineQueueItem[]> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) return [];

  const db = await tenantDBManager.openTenantDB(tenantId);
  return db.getAllFromIndex('offline_queue', 'by-status', 'failed');
}

/**
 * Mark queue item as synced
 */
export async function markQueueItemSynced(itemId: string): Promise<void> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) return;

  const db = await tenantDBManager.openTenantDB(tenantId);
  const item = await db.get('offline_queue', itemId);
  
  if (item) {
    item.status = 'synced';
    await db.put('offline_queue', item);
    console.log(`[OfflineQueue] Marked ${itemId} as synced`);
  }
}

/**
 * Mark queue item as failed
 */
export async function markQueueItemFailed(itemId: string, error: string): Promise<void> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) return;

  const db = await tenantDBManager.openTenantDB(tenantId);
  const item = await db.get('offline_queue', itemId);
  
  if (item) {
    item.status = 'failed';
    item.error = error;
    item.retries++;
    item.last_attempt = Date.now();
    await db.put('offline_queue', item);
    console.warn(`[OfflineQueue] Marked ${itemId} as failed: ${error}`);
  }
}

/**
 * Clear synced queue items (cleanup)
 */
export async function clearSyncedQueueItems(): Promise<number> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) return 0;

  const db = await tenantDBManager.openTenantDB(tenantId);
  const syncedItems = await db.getAllFromIndex('offline_queue', 'by-status', 'synced');
  
  const tx = db.transaction('offline_queue', 'readwrite');
  await Promise.all([
    ...syncedItems.map(item => tx.store.delete(item.id)),
    tx.done,
  ]);

  console.log(`[OfflineQueue] Cleared ${syncedItems.length} synced items`);
  return syncedItems.length;
}

/**
 * Get queue status summary
 */
export async function getQueueStatus(): Promise<{
  pending: number;
  failed: number;
  syncing: boolean;
}> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) {
    return { pending: 0, failed: 0, syncing: false };
  }

  const pending = await getPendingQueueItems();
  const failed = await getFailedQueueItems();

  return {
    pending: pending.length,
    failed: failed.length,
    syncing: false, // TODO: Phase 4 - track sync in progress
  };
}

/**
 * Retry failed queue item
 */
export async function retryQueueItem(itemId: string): Promise<void> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) return;

  const db = await tenantDBManager.openTenantDB(tenantId);
  const item = await db.get('offline_queue', itemId);
  
  if (item && item.status === 'failed') {
    item.status = 'pending';
    item.error = undefined;
    item.last_attempt = undefined;
    await db.put('offline_queue', item);
    console.log(`[OfflineQueue] Retrying ${itemId}`);
  }
}

/**
 * Clear all queue items for current tenant (nuclear option)
 */
export async function clearAllQueueItems(): Promise<number> {
  const tenantId = sessionManager.getTenantId();
  if (!tenantId) return 0;

  const db = await tenantDBManager.openTenantDB(tenantId);
  const allItems = await db.getAll('offline_queue');
  
  const tx = db.transaction('offline_queue', 'readwrite');
  await Promise.all([
    ...allItems.map(item => tx.store.delete(item.id)),
    tx.done,
  ]);

  console.warn(`[OfflineQueue] Cleared all ${allItems.length} queue items`);
  return allItems.length;
}
