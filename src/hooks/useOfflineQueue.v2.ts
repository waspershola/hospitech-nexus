/**
 * Offline Queue Hook V2 - Phase 2
 * Enhanced hook with tenant isolation
 * GUARDED: Only runs in Electron context
 */

import { useState, useEffect } from 'react';
import { isElectronContext } from '@/lib/environment/isElectron';
import { toast } from 'sonner';

// Lazy imports for Electron-only modules
let getQueueStatus: any = null;
let sessionManager: any = null;

export function useOfflineQueueV2() {
  // GUARD: Check Electron context
  const inElectron = isElectronContext();
  
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize Electron-only modules
  useEffect(() => {
    if (!inElectron) return;
    
    const initModules = async () => {
      try {
        const offlineQueueModule = await import('@/lib/offline/offlineQueue');
        const sessionManagerModule = await import('@/lib/offline/sessionManager');
        
        getQueueStatus = offlineQueueModule.getQueueStatus;
        sessionManager = sessionManagerModule.sessionManager;
        
        // Get tenant ID from session
        const tid = sessionManager.getTenantId?.() || null;
        setTenantId(tid);
        setInitialized(true);
      } catch (err) {
        console.warn('[useOfflineQueueV2] Failed to load offline modules:', err);
      }
    };
    
    initModules();
  }, [inElectron]);

  // Monitor network status (works in both browser and Electron)
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Poll queue status (Electron only)
  useEffect(() => {
    if (!inElectron || !initialized || !getQueueStatus || !tenantId) return;

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
    const interval = setInterval(checkQueue, 10000);

    return () => clearInterval(interval);
  }, [inElectron, initialized, tenantId]);

  // Manual sync trigger (Electron only)
  const triggerSync = async () => {
    if (!inElectron) return;
    
    if (!tenantId) {
      toast.error('No active session');
      return;
    }

    setIsSyncing(true);
    try {
      toast.info('Sync will be implemented in Phase 4');
      
      if (getQueueStatus) {
        const status = await getQueueStatus();
        setPendingCount(status.pending);
        setFailedCount(status.failed);
      }
    } catch (error) {
      toast.error('Sync failed');
      console.error('[useOfflineQueue] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when coming online (Electron only)
  useEffect(() => {
    if (inElectron && isOnline && pendingCount > 0 && tenantId) {
      triggerSync();
    }
  }, [isOnline, inElectron, tenantId]);

  return {
    pendingCount,
    failedCount,
    isOnline,
    isSyncing,
    triggerSync,
    tenantId,
  };
}
