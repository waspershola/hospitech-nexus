import { useEffect, useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isElectronContext } from '@/lib/offline/offlineTypes';

interface RealTimeSyncIndicatorProps {
  folioId: string;
  className?: string;
}

/**
 * Displays real-time sync status indicator for folio updates
 * Shows green pulsing indicator when connected to real-time updates
 */
export function RealTimeSyncIndicator({ folioId, className }: RealTimeSyncIndicatorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const registeredChannelId = useRef<string | null>(null);

  const handleSync = useCallback(() => {
    setLastSync(new Date());
    setIsConnected(true);
  }, []);

  useEffect(() => {
    const isElectron = isElectronContext();

    // For Electron: Use registry
    if (isElectron) {
      import('@/lib/offline/offlineRuntimeController').then(({ offlineRuntimeController }) => {
        const channelId = offlineRuntimeController.registerRealtimeChannel({
          id: `folio-sync-${folioId}`,
          channelName: `folio-sync-${folioId}`,
          postgresChanges: [
            {
              event: '*',
              table: 'stay_folios',
              filter: `id=eq.${folioId}`,
              handler: handleSync
            },
            {
              event: '*',
              table: 'folio_transactions',
              filter: `folio_id=eq.${folioId}`,
              handler: handleSync
            }
          ],
          onSubscribed: () => setIsConnected(true)
        });
        registeredChannelId.current = channelId;
      });

      return () => {
        if (registeredChannelId.current) {
          import('@/lib/offline/offlineRuntimeController').then(({ offlineRuntimeController }) => {
            offlineRuntimeController.unregisterRealtimeChannel(registeredChannelId.current!);
            registeredChannelId.current = null;
          });
        }
      };
    }

    // For SPA: Direct subscription
    const channel = supabase
      .channel(`folio-sync-${folioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stay_folios',
        filter: `id=eq.${folioId}`,
      }, handleSync)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folio_transactions',
        filter: `folio_id=eq.${folioId}`,
      }, handleSync)
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folioId, handleSync]);

  return (
    <Badge
      variant={isConnected ? 'default' : 'secondary'}
      className={className}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3 mr-1 animate-pulse" />
          Live
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </>
      )}
      {lastSync && (
        <span className="ml-1 text-xs opacity-70">
          {lastSync.toLocaleTimeString()}
        </span>
      )}
    </Badge>
  );
}
