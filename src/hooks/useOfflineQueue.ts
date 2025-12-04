/**
 * Legacy Offline Queue Hook
 * GUARDED: Only initializes in Electron context
 * 
 * Note: This is the legacy hook. Consider using useOfflineQueueV2 for new code.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { isElectronContext } from '@/lib/environment/isElectron';

// Lazy-loaded queue functions (Electron-only)
let syncQueue: (() => Promise<{ success: number; failed: number }>) | null = null;
let getPendingActions: (() => Promise<any[]>) | null = null;

export function useOfflineQueue() {
  const inElectron = isElectronContext();
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialized, setInitialized] = useState(false);

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

  // Lazy load queue functions only in Electron
  useEffect(() => {
    if (!inElectron) return;
    
    const loadQueueFunctions = async () => {
      try {
        const module = await import('@/lib/offlineQueue');
        syncQueue = module.syncQueue;
        getPendingActions = module.getPendingActions;
        setInitialized(true);
      } catch (err) {
        console.warn('[useOfflineQueue] Failed to load queue module:', err);
      }
    };
    
    loadQueueFunctions();
  }, [inElectron]);

  // Poll for pending actions (Electron only)
  useEffect(() => {
    if (!inElectron || !initialized || !getPendingActions) return;

    const checkPending = async () => {
      try {
        const actions = await getPendingActions();
        setPendingCount(actions.length);
      } catch (err) {
        console.warn('[useOfflineQueue] Failed to check pending:', err);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 10000);

    return () => clearInterval(interval);
  }, [inElectron, initialized]);

  const sync = useCallback(async () => {
    if (!inElectron || !initialized || !syncQueue || !getPendingActions) {
      return;
    }

    setIsSyncing(true);
    try {
      const { success, failed } = await syncQueue();
      
      if (success > 0) {
        toast.success(`Synced ${success} offline action(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to sync ${failed} action(s)`);
      }
      
      const actions = await getPendingActions();
      setPendingCount(actions.length);
    } catch (error: any) {
      toast.error(`Sync failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [inElectron, initialized]);

  // Auto-sync when coming online (Electron only)
  useEffect(() => {
    if (inElectron && isOnline && pendingCount > 0 && initialized) {
      sync();
    }
  }, [isOnline, inElectron, initialized]);

  return {
    pendingCount,
    isOnline,
    sync,
    isSyncing,
  };
}
