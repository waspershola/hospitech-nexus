/**
 * Offline Queue Hook V2 - Phase 2
 * Enhanced hook with tenant isolation
 */

import { useState, useEffect } from 'react';
import { useOfflineSession } from './useOfflineSession';
import {
  getQueueStatus,
  getPendingQueueItems,
  getFailedQueueItems,
  clearSyncedQueueItems,
} from '@/lib/offline/offlineQueue';
import { toast } from 'sonner';

export function useOfflineQueueV2() {
  const { tenantId } = useOfflineSession();
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor network status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Poll queue status
  useEffect(() => {
    if (!tenantId) return;

    const checkQueue = async () => {
      try {
        const status = await getQueueStatus();
        setPendingCount(status.pending);
        setFailedCount(status.failed);
      } catch (error) {
        console.error('[useOfflineQueue] Failed to check queue:', error);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 10000); // Every 10s

    return () => clearInterval(interval);
  }, [tenantId]);

  // Manual sync trigger (Phase 4 will implement actual sync logic)
  const triggerSync = async () => {
    if (!tenantId) {
      toast.error('No active session');
      return;
    }

    setIsSyncing(true);
    try {
      // TODO: Phase 4 - Implement actual sync engine
      toast.info('Sync will be implemented in Phase 4');
      
      // For now, just refresh status
      const status = await getQueueStatus();
      setPendingCount(status.pending);
      setFailedCount(status.failed);
    } catch (error) {
      toast.error('Sync failed');
      console.error('[useOfflineQueue] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && tenantId) {
      triggerSync();
    }
  }, [isOnline, tenantId]);

  return {
    pendingCount,
    failedCount,
    isOnline,
    isSyncing,
    triggerSync,
    tenantId,
  };
}
