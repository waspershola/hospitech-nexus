/**
 * Offline-Aware Request Wrapper - Phase 3
 * Intercepts all mutations and routes through queue when offline
 * Updated to use centralized network store
 */

import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from './sessionManager';
import { queueOfflineRequest } from './offlineQueue';
import { isElectronContext, getElectronAPI } from './offlineTypes';
import { useNetworkStore } from '@/state/networkStore';

/**
 * Check if we're currently offline
 * Uses centralized network store as single source of truth
 */
function isOffline(): boolean {
  // Check Zustand store first (most accurate when Electron is present)
  const { hardOffline } = useNetworkStore.getState();
  if (hardOffline) return true;
  
  // Check global flag
  if (window.__HARD_OFFLINE__) return true;
  
  // Browser fallback
  if (!navigator.onLine) return true;
  
  // Legacy Electron check
  if (isElectronContext()) {
    const onlineStatus = (window as any).__electronOnline;
    return onlineStatus !== undefined ? !onlineStatus : false;
  }
  
  return false;
}

/**
 * Offline-aware wrapper for Supabase Edge Function calls
 */
export async function offlineAwareEdgeFunction<T = any>(
  functionName: string,
  payload: any
): Promise<{ data: T | null; error: any; queued?: boolean }> {
  const tenantId = sessionManager.getTenantId();
  const userId = sessionManager.getUserId();

  if (!tenantId || !userId) {
    return { data: null, error: new Error('No active session') };
  }

  // If online, call directly
  if (!isOffline()) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });
      return { data, error };
    } catch (error) {
      console.error(`[OfflineAwareClient] Edge function ${functionName} failed:`, error);
      return { data: null, error };
    }
  }

  // If offline, queue for later
  try {
    const url = `/functions/v1/${functionName}`;
    const requestId = await queueOfflineRequest(url, 'POST', payload);
    
    console.log(`[OfflineAwareClient] Queued ${functionName} for offline sync: ${requestId}`);
    
    return {
      data: { 
        success: true, 
        message: 'Request queued for sync',
        requestId,
      } as any,
      error: null,
      queued: true,
    };
  } catch (error) {
    console.error(`[OfflineAwareClient] Failed to queue ${functionName}:`, error);
    return { data: null, error };
  }
}

/**
 * Offline-aware wrapper for Supabase RPC calls
 */
export async function offlineAwareRPC<T = any>(
  functionName: string,
  params: any
): Promise<{ data: T | null; error: any; queued?: boolean }> {
  const tenantId = sessionManager.getTenantId();
  const userId = sessionManager.getUserId();

  if (!tenantId || !userId) {
    return { data: null, error: new Error('No active session') };
  }

  // If online, call directly
  if (!isOffline()) {
    try {
      // Use type assertion to bypass strict typing
      const { data, error } = await (supabase.rpc as any)(functionName, params);
      return { data: data as T, error };
    } catch (error) {
      console.error(`[OfflineAwareClient] RPC ${functionName} failed:`, error);
      return { data: null, error };
    }
  }

  // If offline, queue for later
  try {
    const url = `/rest/v1/rpc/${functionName}`;
    const requestId = await queueOfflineRequest(url, 'POST', params);
    
    console.log(`[OfflineAwareClient] Queued RPC ${functionName} for offline sync: ${requestId}`);
    
    return {
      data: { 
        success: true, 
        message: 'RPC queued for sync',
        requestId,
      } as any,
      error: null,
      queued: true,
    };
  } catch (error) {
    console.error(`[OfflineAwareClient] Failed to queue RPC ${functionName}:`, error);
    return { data: null, error };
  }
}

/**
 * Offline-aware wrapper for generic mutations (INSERT/UPDATE/DELETE)
 */
export async function offlineAwareMutation<T = any>(
  table: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  payload: any
): Promise<{ data: T | null; error: any; queued?: boolean }> {
  const tenantId = sessionManager.getTenantId();
  const userId = sessionManager.getUserId();

  if (!tenantId || !userId) {
    return { data: null, error: new Error('No active session') };
  }

  // If online, perform mutation directly via Supabase client
  if (!isOffline()) {
    try {
      let query;
      // Use type assertion to bypass strict typing
      const tableRef = (supabase.from as any)(table);
      
      switch (method) {
        case 'POST':
          query = tableRef.insert(payload).select();
          break;
        case 'PUT':
        case 'PATCH':
          query = tableRef.update(payload).eq('id', payload.id).select();
          break;
        case 'DELETE':
          query = tableRef.delete().eq('id', payload.id);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      const { data, error } = await query;
      return { data: data as T, error };
    } catch (error) {
      console.error(`[OfflineAwareClient] Mutation ${method} ${table} failed:`, error);
      return { data: null, error };
    }
  }

  // If offline, queue for later
  try {
    const url = `/rest/v1/${table}`;
    const requestId = await queueOfflineRequest(url, method, payload);
    
    console.log(`[OfflineAwareClient] Queued ${method} ${table} for offline sync: ${requestId}`);
    
    return {
      data: { 
        success: true, 
        message: 'Mutation queued for sync',
        requestId,
      } as any,
      error: null,
      queued: true,
    };
  } catch (error) {
    console.error(`[OfflineAwareClient] Failed to queue ${method} ${table}:`, error);
    return { data: null, error };
  }
}

/**
 * Initialize online/offline status listener
 * Now handled centrally in main.tsx - this function is for backwards compatibility
 */
export function initializeOfflineListener(): () => void {
  console.log('[OfflineAwareClient] Listener initialization delegated to main.tsx bootstrap');
  
  // Legacy: still set up browser events for backwards compatibility
  const handleOnline = () => {
    console.log('[OfflineAwareClient] Browser went online');
    (window as any).__electronOnline = true;
  };

  const handleOffline = () => {
    console.log('[OfflineAwareClient] Browser went offline');
    (window as any).__electronOnline = false;
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Electron-specific listener (legacy)
  let unsubscribeElectron: (() => void) | undefined;
  if (isElectronContext()) {
    const electronAPI = getElectronAPI();
    unsubscribeElectron = electronAPI?.onOnlineStatusChange((isOnline) => {
      console.log(`[OfflineAwareClient] Electron reports ${isOnline ? 'online' : 'offline'}`);
      (window as any).__electronOnline = isOnline;
    });
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (unsubscribeElectron) unsubscribeElectron();
  };
}
