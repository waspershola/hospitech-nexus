/**
 * Offline Status Indicator - Phase 3
 * Shows online/offline status with queue count badge
 * ELECTRON-ONLY-V1: Only renders in Electron desktop app
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOfflineQueueV2 } from '@/hooks/useOfflineQueue.v2';
import { isElectronContext } from '@/lib/offline/offlineTypes';

export function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { pendingCount, failedCount } = useOfflineQueueV2();
  const isElectron = isElectronContext();

  useEffect(() => {
    // ELECTRON-ONLY-V1: Only setup listeners in Electron
    if (!isElectron) return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isElectron]);

  // Only show in Electron desktop app
  if (!isElectron) {
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
