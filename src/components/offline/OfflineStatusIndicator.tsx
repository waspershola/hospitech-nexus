/**
 * Offline Status Indicator - Phase 3
 * Shows online/offline status with queue count badge
 * GUARDED: Only renders in Electron context
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isElectronContext } from '@/lib/environment/isElectron';

export function OfflineStatusIndicator() {
  // Call hooks FIRST (before any guards) to respect Rules of Hooks
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  
  // Check Electron context once
  const inElectron = isElectronContext();

  // Lazy load queue status only in Electron
  useEffect(() => {
    // Skip if not in Electron
    if (!inElectron) return;
    
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    const loadQueueStatus = async () => {
      try {
        // Dynamic import only happens in Electron context
        const { getQueueStatus } = await import('@/lib/offline/offlineQueue');
        
        const checkQueue = async () => {
          if (!mounted) return;
          try {
            const status = await getQueueStatus();
            setPendingCount(status.pending);
            setFailedCount(status.failed);
          } catch (err) {
            console.warn('[OfflineStatusIndicator] Queue check failed:', err);
          }
        };
        
        checkQueue();
        intervalId = setInterval(checkQueue, 10000);
      } catch (err) {
        console.warn('[OfflineStatusIndicator] Failed to load queue module:', err);
      }
    };
    
    loadQueueStatus();
    
    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [inElectron]);

  // Network status listener (works in both browser and Electron)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // GUARD: Only show in Electron desktop app - check AFTER hooks
  if (!inElectron) {
    return null;
  }

  const totalPending = pendingCount + failedCount;

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wifi className="h-3.5 w-3.5 text-green-600" />
          <span>Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-warning">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline</span>
        </div>
      )}

      {totalPending > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {totalPending} pending
        </Badge>
      )}
    </div>
  );
}
