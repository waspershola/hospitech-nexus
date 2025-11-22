import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EdgeFunctionOptions {
  functionName: string;
  payload: any;
  maxRetries?: number;
}

interface EdgeFunctionResult<T = any> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

/**
 * Hook for calling edge functions with automatic token refresh retry on 401
 * 
 * @example
 * const { callFunction, isLoading } = useEdgeFunctionWithRetry();
 * 
 * const result = await callFunction({
 *   functionName: 'extend-stay',
 *   payload: { booking_id, new_checkout }
 * });
 */
export function useEdgeFunctionWithRetry() {
  const [isLoading, setIsLoading] = useState(false);

  const callFunction = async <T = any>({
    functionName,
    payload,
    maxRetries = 1,
  }: EdgeFunctionOptions): Promise<EdgeFunctionResult<T>> => {
    setIsLoading(true);
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(`[useEdgeFunctionWithRetry] SESSION_ERROR:`, sessionError);
          throw new Error(`SESSION_ERROR: ${sessionError.message}`);
        }

        if (!session?.access_token) {
          throw new Error('NO_SESSION: Please login to continue');
        }

        console.log(`[useEdgeFunctionWithRetry] Calling ${functionName} (attempt ${retries + 1}/${maxRetries + 1})`);

        // Call edge function with explicit auth header
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload,
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) {
          console.error(`[useEdgeFunctionWithRetry] ${functionName} error:`, error);

          // Check if it's a JWT/session error and we can retry
          if ((error.message?.includes('JWT') || error.message?.includes('jwt')) && retries < maxRetries) {
            console.log(`[useEdgeFunctionWithRetry] Attempting token refresh (retry ${retries + 1})`);
            
            // Attempt to refresh the session
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error(`[useEdgeFunctionWithRetry] Token refresh failed:`, refreshError);
              throw new Error('SESSION_EXPIRED: Please login again');
            }
            
            retries++;
            continue; // Retry with refreshed token
          }

          // Map error types to user-friendly messages
          if (error.message?.includes('JWT') || error.message?.includes('jwt')) {
            throw new Error('SESSION_EXPIRED: Please refresh and try again');
          }

          if (error.message?.includes('tenant')) {
            throw new Error('TENANT_MISMATCH: Invalid tenant access');
          }

          if (error.message?.includes('401')) {
            throw new Error('UNAUTHORIZED: Authentication failed');
          }

          throw new Error(`EDGE_FUNCTION_ERROR: ${error.message}`);
        }

        // Success - return the data
        setIsLoading(false);
        return { data, error: null, isLoading: false };

      } catch (err) {
        // If we've exhausted retries, throw the error
        if (retries >= maxRetries) {
          setIsLoading(false);
          const error = err instanceof Error ? err : new Error(String(err));
          return { data: null, error, isLoading: false };
        }
        
        retries++;
      }
    }

    // Should never reach here, but just in case
    setIsLoading(false);
    return {
      data: null,
      error: new Error('UNKNOWN_ERROR: Max retries exceeded'),
      isLoading: false
    };
  };

  return { callFunction, isLoading };
}
