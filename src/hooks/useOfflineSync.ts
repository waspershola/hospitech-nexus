/**
 * Offline Sync Hook - Phase 4
 * React hook for sync engine operations and progress tracking
 * GUARDED: Only runs in Electron context
 */

import { useState, useEffect, useCallback } from 'react';
import { isElectronContext } from '@/lib/environment/isElectron';
import { toast } from 'sonner';

// Lazy imports for Electron-only modules
let syncEngine: any = null;
let initializeAutoSync: any = null;
let sessionManager: any = null;

// Default sync progress for browser mode
const DEFAULT_SYNC_PROGRESS = {
  total: 0,
  synced: 0,
  failed: 0,
  inProgress: false,
  errors: [] as string[],
};

// Default sync result for browser mode
const DEFAULT_SYNC_RESULT = {
  success: false,
  synced: 0,
  failed: 0,
  errors: [] as string[],
};

export function useOfflineSync() {
  // GUARD: Return dummy values in browser mode (before any hooks)
  const inElectron = isElectronContext();
  
  const [syncProgress, setSyncProgress] = useState(DEFAULT_SYNC_PROGRESS);
  const [queueCount, setQueueCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Initialize Electron-only modules
  useEffect(() => {
    if (!inElectron) return;
    
    const initModules = async () => {
      try {
        const syncEngineModule = await import('@/lib/offline/syncEngine');
        const sessionManagerModule = await import('@/lib/offline/sessionManager');
        
        syncEngine = syncEngineModule.syncEngine;
        initializeAutoSync = syncEngineModule.initializeAutoSync;
        sessionManager = sessionManagerModule.sessionManager;
        setInitialized(true);
      } catch (err) {
        console.warn('[useOfflineSync] Failed to load offline modules:', err);
      }
    };
    
    initModules();
  }, [inElectron]);

  // Update queue count periodically (Electron only)
  useEffect(() => {
    if (!inElectron || !initialized || !syncEngine || !sessionManager) return;

    const updateQueueCount = async () => {
      const tenantId = sessionManager.getTenantId();
      if (!tenantId) return;

      const status = await syncEngine.getQueueStatus(tenantId);
      setQueueCount(status.pending);
    };

    updateQueueCount();
    const interval = setInterval(updateQueueCount, 10000);

    return () => clearInterval(interval);
  }, [inElectron, initialized]);

  // Subscribe to sync progress (Electron only)
  useEffect(() => {
    if (!inElectron || !initialized || !syncEngine) return;

    const unsubscribe = syncEngine.onSyncProgress((progress: typeof DEFAULT_SYNC_PROGRESS) => {
      setSyncProgress(progress);

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
  }, [inElectron, initialized]);

  // Initialize auto-sync on mount (Electron only)
  useEffect(() => {
    if (!inElectron || !initialized || !initializeAutoSync) return;
    
    const cleanup = initializeAutoSync();
    return cleanup;
  }, [inElectron, initialized]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!inElectron || !syncEngine || !sessionManager) {
      return DEFAULT_SYNC_RESULT;
    }

    if (syncEngine.isCurrentlySyncing) {
      toast.info('Sync already in progress');
      return DEFAULT_SYNC_RESULT;
    }

    const result = await syncEngine.syncAll();
    
    const tenantId = sessionManager.getTenantId();
    if (tenantId) {
      const status = await syncEngine.getQueueStatus(tenantId);
      setQueueCount(status.pending);
    }

    return result;
  }, [inElectron]);

  // Retry failed items
  const retryFailed = useCallback(async () => {
    if (!inElectron || !syncEngine || !sessionManager) {
      return DEFAULT_SYNC_RESULT;
    }

    const result = await syncEngine.retryFailed();
    
    const tenantId = sessionManager.getTenantId();
    if (tenantId) {
      const status = await syncEngine.getQueueStatus(tenantId);
      setQueueCount(status.pending);
    }

    return result;
  }, [inElectron]);

  return {
    syncProgress,
    queueCount,
    isSyncing: syncProgress.inProgress,
    lastSyncAt: (syncProgress as any).lastSyncAt,
    triggerSync,
    retryFailed,
  };
}
