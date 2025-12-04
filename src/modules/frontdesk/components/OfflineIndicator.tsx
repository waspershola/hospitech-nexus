import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { isElectron } from '@/lib/environment/isElectron';
import { useState, useEffect } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // In SPA mode (non-Electron), just show online status
  if (!isElectron) {
    // Show nothing when online in SPA mode
    if (isOnline) {
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
    
    // Show offline banner in SPA mode
    return (
      <div className="fixed top-0 left-0 right-0 z-50 lg:left-64">
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're offline. Please reconnect to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Electron mode - full offline queue functionality would be here
  // For now, just show basic status (Electron-specific queue logic removed)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-success" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>{isOnline ? 'Connected' : 'Offline'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
