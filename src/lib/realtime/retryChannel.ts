import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, nextDelay: number) => void;
  onFailure?: () => void;
}

/**
 * PHASE-2: Realtime Retry Logic with Exponential Backoff
 * Creates a Supabase realtime channel with automatic retry logic
 * 
 * Features:
 * - Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max
 * - Auto-reconnect on network restore (navigator.onLine)
 * - Toast notification after permanent failure (5 retries)
 * - Callback hooks for retry and failure events
 */
export function createRealtimeChannelWithRetry(
  channelName: string,
  config: RetryConfig = {}
) {
  const {
    maxRetries = 5,
    baseDelay = 1000, // 1s
    maxDelay = 30000, // 30s
    onRetry,
    onFailure,
  } = config;

  let retryCount = 0;
  let retryTimeout: NodeJS.Timeout | null = null;
  let currentChannel: any = null;

  function calculateDelay(attempt: number): number {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  }

  function attemptConnection() {
    console.log(`[retryChannel] Attempting connection for ${channelName} (attempt ${retryCount + 1}/${maxRetries})`);
    
    currentChannel = supabase.channel(channelName);

    // Store the original subscribe method
    const originalSubscribe = currentChannel.subscribe.bind(currentChannel);

    // Override subscribe to add status monitoring
    currentChannel.subscribe = (callback?: (status: string) => void) => {
      return originalSubscribe((status: string) => {
        console.log(`[retryChannel] ${channelName} status:`, status);

        if (status === 'SUBSCRIBED') {
          console.log(`[retryChannel] ${channelName} subscribed successfully`);
          retryCount = 0; // Reset on success
          
          // Call original callback if provided
          callback?.(status);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          retryCount++;

          if (retryCount <= maxRetries) {
            const delay = calculateDelay(retryCount);
            console.warn(
              `[retryChannel] ${channelName} failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms`
            );

            onRetry?.(retryCount, delay);

            retryTimeout = setTimeout(() => {
              supabase.removeChannel(currentChannel);
              attemptConnection();
            }, delay);
          } else {
            console.error(`[retryChannel] ${channelName} failed permanently after ${maxRetries} retries`);
            
            onFailure?.();
            
            // Show toast notification
            toast.error('Connection Lost', {
              description: 'Failed to connect to notification system. Please refresh the page.',
              duration: 10000,
            });
          }
          
          // Call original callback if provided
          callback?.(status);
        } else {
          // Call original callback for other statuses
          callback?.(status);
        }
      });
    };

    return currentChannel;
  }

  // Reconnect when network comes back online
  const handleOnline = () => {
    console.log('[retryChannel] Network restored, reconnecting channels');
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

  window.addEventListener('online', handleOnline);

  // Cleanup function
  const cleanup = () => {
    window.removeEventListener('online', handleOnline);
    
    if (retryTimeout) {
      clearTimeout(retryTimeout);
    }
    
    if (currentChannel) {
      supabase.removeChannel(currentChannel);
    }
  };

  // Start initial connection
  const channel = attemptConnection();
  
  // Attach cleanup to channel
  (channel as any).cleanup = cleanup;

  return channel;
}
