/**
 * Sync Engine - Phase 4 + Offline Phase 2
 * Handles automatic synchronization of offline queue with conflict resolution
 * Now respects unified offline state from Electron bridge
 */

import { supabase } from '@/integrations/supabase/client';
import { tenantDBManager } from './tenantDBManager';
import { sessionManager } from './sessionManager';
import { isElectronContext } from './offlineTypes';
import type { OfflineQueueItem } from './offlineTypes';

/**
 * Check if currently offline using unified network state
 */
function isNetworkOffline(): boolean {
  if (window.__HARD_OFFLINE__ === true) return true;
  const s = window.__NETWORK_STATE__;
  if (s?.hardOffline === true) return true;
  if (s?.online === false) return true;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return false;
}

export interface SyncProgress {
  total: number;
  synced: number;
  failed: number;
  inProgress: boolean;
  lastSyncAt?: Date;
  errors: Array<{ requestId: string; error: string }>;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ requestId: string; error: string }>;
}

/**
 * Sync Engine Class
 * Manages offline queue synchronization with Supabase
 */
class SyncEngine {
  private isSyncing = false;
  private syncListeners: Set<(progress: SyncProgress) => void> = new Set();
  private lastSyncAt?: Date;
  private retryDelays = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

  /**
   * Subscribe to sync progress updates
   */
  onSyncProgress(callback: (progress: SyncProgress) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  /**
   * Notify all listeners of sync progress
   */
  private notifyProgress(progress: SyncProgress) {
    this.syncListeners.forEach(listener => listener(progress));
  }

  /**
   * Check if currently syncing
   */
  get isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync timestamp
   */
  get lastSync(): Date | undefined {
    return this.lastSyncAt;
  }

  /**
   * Emit sync telemetry to Electron main process (Phase 4)
   */
  private emitSyncEvent(event: { type: 'start' | 'complete' | 'error'; queued?: number; synced?: number; failed?: number; error?: string }) {
    if (isElectronContext() && window.electronAPI?.syncEvent) {
      try {
        window.electronAPI.syncEvent({
          ...event,
          timestamp: Date.now(),
        });
        console.log(`[SyncEngine-V4] Emitted sync event: ${event.type}`);
      } catch (error) {
        console.warn('[SyncEngine-V4] Failed to emit sync event:', error);
      }
    }
  }

  /**
   * Main sync function - processes offline queue
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncEngine] Sync already in progress, skipping');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    // OFFLINE-PHASE2: Check unified offline state before syncing
    if (isNetworkOffline()) {
      console.log('[SyncEngine] Skipping sync: offline/hardOffline state detected');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    const tenantId = sessionManager.getTenantId();
    const userId = sessionManager.getUserId();

    if (!tenantId || !userId) {
      console.warn('[SyncEngine] No active session, cannot sync');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    const errors: Array<{ requestId: string; error: string }> = [];
    let synced = 0;
    let failed = 0;

    // Emit sync start event (Phase 4)
    this.emitSyncEvent({ type: 'start' });

    try {
      // Get all pending items from queue
      const db = await tenantDBManager.openTenantDB(tenantId);
      const pendingItems = await db.getAll('offline_queue');
      const total = pendingItems.length;

      console.log(`[SyncEngine-V4] Starting sync: ${total} items in queue`);

      this.notifyProgress({
        total,
        synced: 0,
        failed: 0,
        inProgress: true,
        errors: [],
      });

      // Process each item sequentially to maintain order
      for (const item of pendingItems) {
        try {
          const result = await this.syncItem(item, tenantId);
          
          if (result.success) {
            synced++;
            // Mark as synced in database
            await db.delete('offline_queue', item.id);
            
            // Update sync_metadata
            await db.put('sync_metadata', {
              entity: `offline_request_${item.id}`,
              last_sync_at: Date.now(),
              last_sync_success: true,
              total_records: 1,
            }, `last_sync_${item.id}`);
          } else {
            failed++;
            errors.push({ requestId: item.id, error: result.error || 'Unknown error' });
            
            // Update item with error
            const lastAttempt = Date.now();
            await db.put('offline_queue', {
              ...item,
              status: 'failed',
              error: result.error,
              last_attempt: lastAttempt,
            });
          }
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ requestId: item.id, error: errorMsg });
          console.error(`[SyncEngine] Error syncing item ${item.id}:`, error);
        }

        // Notify progress after each item
        this.notifyProgress({
          total,
          synced,
          failed,
          inProgress: true,
          errors,
        });
      }

      this.lastSyncAt = new Date();

      // Final progress notification
      this.notifyProgress({
        total,
        synced,
        failed,
        inProgress: false,
        lastSyncAt: this.lastSyncAt,
        errors,
      });

      console.log(`[SyncEngine-V4] Sync complete: ${synced} synced, ${failed} failed`);

      // Emit sync complete event (Phase 4)
      const remainingItems = await db.getAll('offline_queue');
      this.emitSyncEvent({ 
        type: 'complete', 
        queued: remainingItems.length,
        synced,
        failed,
      });

      return { success: failed === 0, synced, failed, errors };
    } catch (error) {
      console.error('[SyncEngine-V4] Fatal sync error:', error);
      
      // Emit sync error event (Phase 4)
      this.emitSyncEvent({ 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return { success: false, synced, failed, errors };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single queue item
   */
  private async syncItem(
    item: OfflineQueueItem,
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[SyncEngine] Syncing item ${item.id}: ${item.method} ${item.url}`);

      // Conflict resolution: Desktop wins for offline-originated data
      // Add metadata to indicate offline origin
      const payload = {
        ...item.payload,
        _offline_metadata: {
          queuedAt: item.created_at,
          syncedAt: new Date().toISOString(),
          deviceType: isElectronContext() ? 'desktop' : 'web',
          tenantId,
        },
      };

      // Determine request type and call appropriate function
      if (item.url.startsWith('/functions/v1/')) {
        // Edge function call
        const functionName = item.url.replace('/functions/v1/', '');
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } else if (item.url.startsWith('/rest/v1/rpc/')) {
        // RPC call
        const functionName = item.url.replace('/rest/v1/rpc/', '');
        const { error } = await (supabase.rpc as any)(functionName, payload);

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } else if (item.url.startsWith('/rest/v1/')) {
        // Table mutation
        const table = item.url.replace('/rest/v1/', '').split('?')[0];
        let query;

        switch (item.method) {
          case 'POST':
            query = (supabase.from as any)(table).insert(payload).select();
            break;
          case 'PATCH':
          case 'PUT':
            query = (supabase.from as any)(table)
              .update(payload)
              .eq('id', payload.id)
              .select();
            break;
          case 'DELETE':
            query = (supabase.from as any)(table).delete().eq('id', payload.id);
            break;
          default:
            return { success: false, error: `Unsupported method: ${item.method}` };
        }

        const { error } = await query;

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } else {
        return { success: false, error: 'Unknown URL pattern' };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Retry failed items with exponential backoff
   */
  async retryFailed(): Promise<SyncResult> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const failedItems = await db.getAll('offline_queue');
    
    // Filter items that have failed and respect backoff
    const itemsToRetry = failedItems.filter(item => {
      if (!item.last_attempt) return true; // Never attempted, retry immediately
      
      // Calculate attempts from last_attempt timestamp (rough approximation)
      const timeSinceAttempt = Date.now() - item.last_attempt;
      const attempts = Math.floor(timeSinceAttempt / (60 * 1000)); // Every minute counts as an attempt
      
      if (attempts >= this.retryDelays.length) {
        return false; // Max retries exceeded
      }

      // Check if enough time has passed for retry
      const delay = this.retryDelays[Math.min(attempts, this.retryDelays.length - 1)];
      
      return timeSinceAttempt >= delay;
    });

    console.log(`[SyncEngine] Retrying ${itemsToRetry.length} failed items`);

    // Re-queue items for sync
    return this.syncAll();
  }

  /**
   * Clear all synced items from queue
   */
  async clearSynced(tenantId: string): Promise<void> {
    const db = await tenantDBManager.openTenantDB(tenantId);
    await db.clear('offline_queue');
    console.log('[SyncEngine] Cleared synced items from queue');
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(tenantId: string): Promise<{
    pending: number;
    items: OfflineQueueItem[];
  }> {
    const db = await tenantDBManager.openTenantDB(tenantId);
    const items = await db.getAll('offline_queue');
    
    return {
      pending: items.length,
      items,
    };
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();

/**
 * Initialize auto-sync on connection restore
 */
export function initializeAutoSync(): () => void {
  const handleOnline = () => {
    // OFFLINE-PHASE2: Check unified offline state before auto-sync
    if (isNetworkOffline()) {
      console.log('[SyncEngine] Skipping auto-sync: still in offline/hardOffline state');
      return;
    }
    console.log('[SyncEngine] Connection restored, triggering auto-sync');
    setTimeout(() => syncEngine.syncAll(), 1000); // Delay to ensure connection is stable
  };

  window.addEventListener('online', handleOnline);

  // Electron-specific listener
  let unsubscribeElectron: (() => void) | undefined;
  if (isElectronContext()) {
    unsubscribeElectron = window.electronAPI?.onOnlineStatusChange((isOnline) => {
      // OFFLINE-PHASE2: Double-check unified state, not just isOnline flag
      if (isOnline && !isNetworkOffline()) {
        console.log('[SyncEngine] Electron reports online, triggering auto-sync');
        setTimeout(() => syncEngine.syncAll(), 1000);
      } else if (isOnline) {
        console.log('[SyncEngine] Electron reports online but hardOffline is active, skipping auto-sync');
      }
    });
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    if (unsubscribeElectron) unsubscribeElectron();
  };
}
