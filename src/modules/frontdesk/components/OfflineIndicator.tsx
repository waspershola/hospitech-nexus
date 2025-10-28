import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingCount, sync, isSyncing } = useOfflineQueue();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="w-3 h-3" />
          Offline
        </Badge>
      )}
      
      {pendingCount > 0 && (
        <>
          <Badge variant="secondary" className="gap-1">
            {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
          </Badge>
          
          {isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => sync()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Sync Now
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
