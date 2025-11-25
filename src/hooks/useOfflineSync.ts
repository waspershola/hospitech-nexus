/**
 * Offline Sync Hook - Phase 4
 * React hook for sync engine operations and progress tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { syncEngine, initializeAutoSync } from '@/lib/offline/syncEngine';
import type { SyncProgress, SyncResult } from '@/lib/offline/syncEngine';
import { sessionManager } from '@/lib/offline/sessionManager';
import { toast } from 'sonner';

export function useOfflineSync() {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    synced: 0,
    failed: 0,
    inProgress: false,
    errors: [],
  });

  const [queueCount, setQueueCount] = useState(0);

  // Update queue count periodically
  useEffect(() => {
    const updateQueueCount = async () => {
      const tenantId = sessionManager.getTenantId();
      if (!tenantId) return;

      const status = await syncEngine.getQueueStatus(tenantId);
      setQueueCount(status.pending);
    };

    updateQueueCount();
    const interval = setInterval(updateQueueCount, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Subscribe to sync progress
  useEffect(() => {
    const unsubscribe = syncEngine.onSyncProgress((progress) => {
      setSyncProgress(progress);

      // Show toast notifications for sync completion
      if (!progress.inProgress && progress.total > 0) {
        if (progress.failed === 0) {
          toast.success(`Synced ${progress.synced} offline action(s)`);
        } else if (progress.synced > 0) {
          toast.warning(`Synced ${progress.synced}, failed ${progress.failed} action(s)`);
        } else {
          toast.error(`Failed to sync ${progress.failed} action(s)`);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Initialize auto-sync on mount
  useEffect(() => {
    const cleanup = initializeAutoSync();
    return cleanup;
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    if (syncEngine.isCurrentlySyncing) {
      toast.info('Sync already in progress');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    const result = await syncEngine.syncAll();
    
    // Update queue count after sync
    const tenantId = sessionManager.getTenantId();
    if (tenantId) {
      const status = await syncEngine.getQueueStatus(tenantId);
      setQueueCount(status.pending);
    }

    return result;
  }, []);

  // Retry failed items
  const retryFailed = useCallback(async (): Promise<SyncResult> => {
    const result = await syncEngine.retryFailed();
    
    // Update queue count after retry
    const tenantId = sessionManager.getTenantId();
    if (tenantId) {
      const status = await syncEngine.getQueueStatus(tenantId);
      setQueueCount(status.pending);
    }

    return result;
  }, []);

  return {
    syncProgress,
    queueCount,
    isSyncing: syncProgress.inProgress,
    lastSyncAt: syncProgress.lastSyncAt,
    triggerSync,
    retryFailed,
  };
}
