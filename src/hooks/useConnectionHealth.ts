import { useState, useEffect } from 'react';

interface ConnectionHealth {
  isConnected: boolean;
  lastCheck: Date | null;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
}

/**
 * PHASE-4C: Connection Health Indicator
 * Monitors browser online/offline status and provides real-time connection health
 */
export function useConnectionHealth(): ConnectionHealth {
  const [health, setHealth] = useState<ConnectionHealth>({
    isConnected: navigator.onLine,
    lastCheck: new Date(),
    status: navigator.onLine ? 'connected' : 'disconnected',
  });

  useEffect(() => {
    const handleOnline = () => {
      console.log('[ConnectionHealth] Network online');
      setHealth({
        isConnected: true,
        lastCheck: new Date(),
        status: 'connected',
      });
    };

    const handleOffline = () => {
      console.log('[ConnectionHealth] Network offline');
      setHealth({
        isConnected: false,
        lastCheck: new Date(),
        status: 'disconnected',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setHealth({
      isConnected: navigator.onLine,
      lastCheck: new Date(),
      status: navigator.onLine ? 'connected' : 'disconnected',
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return health;
}
