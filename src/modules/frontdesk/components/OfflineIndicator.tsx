import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingCount, sync, isSyncing } = useOfflineQueue();

  // Show nothing when online and no pending actions
  if (isOnline && pendingCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-success">
              <Wifi className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Connected</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Offline banner mode
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 lg:left-64">
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You're offline. Changes will sync when connection is restored.
              {pendingCount > 0 && ` (${pendingCount} pending)`}
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Online with pending actions
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 cursor-help">
              <AlertCircle className="w-3 h-3" />
              {pendingCount} pending
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {pendingCount} offline action{pendingCount !== 1 ? 's' : ''} waiting to sync
          </TooltipContent>
        </Tooltip>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => sync()}
          disabled={isSyncing}
          className="h-7"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              Sync
            </>
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}
