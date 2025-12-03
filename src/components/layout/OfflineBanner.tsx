/**
 * Global Offline Banner Component
 * Displays when the application is in hard offline mode
 */
import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStore } from '@/state/networkStore';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const { hardOffline, lastChange } = useNetworkStore();
  
  if (!hardOffline) return null;
  
  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground",
        "px-4 py-2 text-center text-sm font-medium",
        "flex items-center justify-center gap-2",
        "animate-in slide-in-from-top duration-300",
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      <span>You're offline. Changes will sync when connection is restored.</span>
      {lastChange && (
        <span className="text-xs opacity-75 ml-2">
          Since {new Date(lastChange).toLocaleTimeString()}
        </span>
      )}
      <RefreshCw className="h-3 w-3 ml-2 animate-spin opacity-50" />
    </div>
  );
}
