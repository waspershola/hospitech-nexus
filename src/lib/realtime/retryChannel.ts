import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isElectronContext } from '@/lib/offline/offlineTypes';

/**
 * Check if currently offline using unified network state
 * In Electron: defers to offlineRuntimeController
 * In SPA: always returns false (online-only)
 */
function isNetworkOffline(): boolean {
  if (!isElectronContext()) return false;
  
  if (window.__HARD_OFFLINE__ === true) return true;
  const s = window.__NETWORK_STATE__;
  if (s?.hardOffline === true) return true;
  if (s?.online === false) return true;
  return false;
}

// Track toast display to prevent spam (30s debounce)
let lastConnectionLostToast = 0;

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, nextDelay: number) => void;
  onFailure?: () => void;
}

/**
 * Creates a Supabase realtime channel with retry logic
 * 
 * In Electron: Uses minimal retries, defers lifecycle to offlineRuntimeController
 * In SPA: Simple retry with exponential backoff (3 attempts max)
 */
export function createRealtimeChannelWithRetry(
  channelName: string,
  config: RetryConfig = {}
) {
  // In Electron, use fewer retries since controller manages lifecycle
  const isElectron = isElectronContext();
  const {
    maxRetries = isElectron ? 2 : 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
    onFailure,
  } = config;

  let retryCount = 0;
  let retryTimeout: NodeJS.Timeout | null = null;
  let currentChannel: any = null;
  let isCleanedUp = false;

  function calculateDelay(attempt: number): number {
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  }

  function attemptConnection() {
    if (isCleanedUp) return null;
    
    // In Electron, don't attempt connection if offline
    if (isElectron && isNetworkOffline()) {
      console.log(`[retryChannel] ${channelName} - skipping: offline`);
      return null;
    }
    
    console.log(`[retryChannel] ${channelName} connecting (attempt ${retryCount + 1}/${maxRetries})`);
    
    currentChannel = supabase.channel(channelName);
    const originalSubscribe = currentChannel.subscribe.bind(currentChannel);

    currentChannel.subscribe = (callback?: (status: string) => void) => {
      return originalSubscribe((status: string) => {
        if (isCleanedUp) return;

        if (status === 'SUBSCRIBED') {
          retryCount = 0;
          callback?.(status);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          retryCount++;

          // In Electron offline, stop immediately - controller will handle reconnect
          if (isElectron && isNetworkOffline()) {
            console.log(`[retryChannel] ${channelName} - offline, stopping retries`);
            callback?.(status);
            return;
          }

          if (retryCount <= maxRetries) {
            const delay = calculateDelay(retryCount);
            console.warn(`[retryChannel] ${channelName} failed, retry ${retryCount}/${maxRetries} in ${delay}ms`);
            onRetry?.(retryCount, delay);

            retryTimeout = setTimeout(() => {
              if (!isCleanedUp && currentChannel) {
                supabase.removeChannel(currentChannel);
                attemptConnection();
              }
            }, delay);
          } else {
            console.error(`[retryChannel] ${channelName} failed after ${maxRetries} retries`);
            onFailure?.();
            
            // Show debounced toast (max once per 30s)
            const now = Date.now();
            if (now - lastConnectionLostToast > 30000) {
              lastConnectionLostToast = now;
              toast.error('Connection Lost', {
                description: 'Realtime updates paused. Retrying...',
                duration: 5000,
              });
            }
          }
          
          callback?.(status);
        } else {
          callback?.(status);
        }
      });
    };

    return currentChannel;
  }

  // Browser online event handler (SPA only - Electron uses controller)
  const handleOnline = () => {
    if (isElectron) return; // Electron handled by controller
    if (isCleanedUp) return;
    
    console.log('[retryChannel] Browser online, reconnecting');
    retryCount = 0;
    
    if (currentChannel) {
      supabase.removeChannel(currentChannel);
    }
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    
    attemptConnection();
  };

  if (!isElectron) {
    window.addEventListener('online', handleOnline);
  }

  const cleanup = () => {
    isCleanedUp = true;
    
    if (!isElectron) {
      window.removeEventListener('online', handleOnline);
    }
    
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    
    if (currentChannel) {
      try {
        supabase.removeChannel(currentChannel);
      } catch (e) {
        // Ignore cleanup errors
      }
      currentChannel = null;
    }
  };

  const channel = attemptConnection();
  if (channel) {
    (channel as any).cleanup = cleanup;
  }

  return channel;
}
