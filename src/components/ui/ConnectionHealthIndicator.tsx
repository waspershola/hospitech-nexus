import { Wifi, WifiOff } from 'lucide-react';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { cn } from '@/lib/utils';

interface ConnectionHealthIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * PHASE-4C: Connection Health Indicator Component
 * Displays real-time connection status with visual feedback
 */
export function ConnectionHealthIndicator({ 
  className, 
  showLabel = false 
}: ConnectionHealthIndicatorProps) {
  const { isConnected, status } = useConnectionHealth();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          {showLabel && (
            <span className="text-xs text-muted-foreground">Connected</span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-destructive" />
          {showLabel && (
            <span className="text-xs text-destructive">Disconnected</span>
          )}
        </>
      )}
    </div>
  );
}
