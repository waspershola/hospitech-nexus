import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  /** Custom className for styling */
  className?: string;
  /** Show animation when coming back online */
  showReconnected?: boolean;
}

/**
 * OfflineIndicator - Shows connectivity status banner
 * Automatically detects online/offline status and displays warning
 */
export function OfflineIndicator({ 
  className,
  showReconnected = true 
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnectedMessage, setShowReconnectedMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline && showReconnected) {
        setShowReconnectedMessage(true);
        // Hide reconnected message after 3 seconds
        setTimeout(() => {
          setShowReconnectedMessage(false);
          setWasOffline(false);
        }, 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnectedMessage(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, showReconnected]);

  // Don't render anything if online and not showing reconnected message
  if (isOnline && !showReconnectedMessage) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-300",
        className
      )}
    >
      {!isOnline ? (
        // Offline Warning
        <Alert 
          variant="destructive"
          className="rounded-none border-0 border-b-2 bg-amber-500/90 backdrop-blur-sm text-white border-amber-600"
        >
          <WifiOff className="h-5 w-5 text-white" />
          <AlertDescription className="ml-2 font-medium flex items-center gap-2">
            <span>You're offline</span>
            <span className="text-sm font-normal opacity-90">
              • Some features may be limited
            </span>
          </AlertDescription>
        </Alert>
      ) : showReconnectedMessage ? (
        // Reconnected Success
        <Alert 
          className="rounded-none border-0 border-b-2 bg-green-500/90 backdrop-blur-sm text-white border-green-600 animate-in fade-in slide-in-from-top duration-500"
        >
          <Wifi className="h-5 w-5 text-white" />
          <AlertDescription className="ml-2 font-medium flex items-center gap-2">
            <span>You're back online</span>
            <span className="text-sm font-normal opacity-90">
              • Connection restored
            </span>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
