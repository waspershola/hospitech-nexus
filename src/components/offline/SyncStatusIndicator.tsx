/**
 * Sync Status Indicator - Phase 4
 * UI component showing sync progress and queue status
 * GUARDED: Only renders in Electron context
 */

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { isElectronContext } from '@/lib/environment/isElectron';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function SyncStatusIndicator() {
  // GUARD: Only show in Electron context - check BEFORE hooks
  if (!isElectronContext()) {
    return null;
  }

  const { syncProgress, queueCount, isSyncing, lastSyncAt, triggerSync, retryFailed } = useOfflineSync();

  const hasErrors = syncProgress.errors.length > 0;
  const hasQueue = queueCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 px-3"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : hasErrors ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : hasQueue ? (
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          ) : (
            <CheckCircle className="h-4 w-4 text-success" />
          )}
          
          {hasQueue && (
            <span className="ml-2 text-xs font-medium">
              {queueCount} pending
            </span>
          )}

          {hasQueue && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {queueCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Offline Queue</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerSync()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1 text-xs">Sync Now</span>
            </Button>
          </div>

          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Syncing...</span>
                <span>
                  {syncProgress.synced} / {syncProgress.total}
                </span>
              </div>
              <Progress 
                value={syncProgress.total > 0 ? (syncProgress.synced / syncProgress.total) * 100 : 0} 
                className="h-2"
              />
            </div>
          )}

          {!isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Queue:</span>
                <span className="font-medium">{queueCount} pending</span>
              </div>

              {lastSyncAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Last Sync:</span>
                  <span className="font-medium">
                    {new Date(lastSyncAt).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {syncProgress.synced > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Synced:</span>
                  <span className="font-medium text-success">
                    {syncProgress.synced}
                  </span>
                </div>
              )}

              {syncProgress.failed > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-destructive">
                    {syncProgress.failed}
                  </span>
                </div>
              )}
            </div>
          )}

          {hasErrors && (
            <div className="space-y-2 border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-destructive">
                  Sync Errors ({syncProgress.errors.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => retryFailed()}
                  disabled={isSyncing}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="ml-1 text-xs">Retry</span>
                </Button>
              </div>
              
              <div className="max-h-32 space-y-1 overflow-y-auto text-xs">
                {syncProgress.errors.slice(0, 5).map((error, idx) => (
                  <div key={idx} className="rounded bg-destructive/10 p-2">
                    <p className="font-mono text-[10px] text-destructive">
                      {typeof error === 'string' ? error : String(error)}
                    </p>
                  </div>
                ))}
                {syncProgress.errors.length > 5 && (
                  <p className="text-center text-muted-foreground">
                    +{syncProgress.errors.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {!hasQueue && !isSyncing && (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
              <CheckCircle className="mr-2 h-4 w-4 text-success" />
              All synced
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
