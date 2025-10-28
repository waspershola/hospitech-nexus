import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { syncQueue, getPendingActions } from '@/lib/offlineQueue';
import { toast } from 'sonner';

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const checkPending = async () => {
      const actions = await getPendingActions();
      setPendingCount(actions.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, []);

  const syncMutation = useMutation({
    mutationFn: syncQueue,
    onSuccess: ({ success, failed }) => {
      if (success > 0) {
        toast.success(`Synced ${success} offline action(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to sync ${failed} action(s)`);
      }
      getPendingActions().then(actions => setPendingCount(actions.length));
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncMutation.mutate();
    }
  }, [isOnline]);

  return {
    pendingCount,
    isOnline,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
