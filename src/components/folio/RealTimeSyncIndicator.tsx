import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RealTimeSyncIndicatorProps {
  folioId: string;
  className?: string;
}

/**
 * Displays real-time sync status indicator for folio updates
 * Shows green pulsing indicator when connected to real-time updates
 * Version: BILLING-CENTER-V2.1-REALTIME-SYNC
 */
export function RealTimeSyncIndicator({ folioId, className }: RealTimeSyncIndicatorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Create real-time channel for folio updates
    const channel = supabase
      .channel(`folio-sync-${folioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stay_folios',
          filter: `id=eq.${folioId}`,
        },
        () => {
          setLastSync(new Date());
          setIsConnected(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folio_transactions',
          filter: `folio_id=eq.${folioId}`,
        },
        () => {
          setLastSync(new Date());
          setIsConnected(true);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folioId]);

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
