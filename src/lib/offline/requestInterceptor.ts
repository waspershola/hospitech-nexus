/**
 * Phase 14: Request Interceptor for Offline Mode
 * Provides utilities to check if requests should be blocked when offline in Electron
 */

import { isElectronContext } from '@/lib/environment/isElectron';

/**
 * Check if a request should be blocked when offline
 * Only applies in Electron context when offline
 * @param url - The URL being requested
 * @returns true if the request should be blocked
 */
export async function shouldBlockOfflineRequest(url: string): Promise<boolean> {
  // Only applies in Electron when offline
  if (!isElectronContext()) return false;
  if (navigator.onLine) return false;
  
  const api = (window as any).electronAPI;
  if (!api?.offlineApi?.offlineData?.shouldBlockRequest) {
    // Default: block all network requests when offline
    return true;
  }
  
  try {
    return await api.offlineApi.offlineData.shouldBlockRequest(url);
  } catch (e) {
    console.warn('[requestInterceptor] shouldBlockRequest failed:', e);
    return true; // Fail-safe: block when uncertain
  }
}

/**
 * Check if we're in offline mode (Electron + no network)
 */
export function isOfflineMode(): boolean {
  return isElectronContext() && !navigator.onLine;
}

/**
 * Graceful offline error response
 * Use this to return a consistent error structure when blocking requests
 */
export function createOfflineBlockedResponse<T = null>(): { data: T | null; error: string } {
  return { data: null, error: 'offline-blocked' };
}

/**
 * Wrapper for async operations that should gracefully fail when offline
 * @param operation - The async operation to execute
 * @param fallbackValue - Value to return if offline
 */
export async function withOfflineGuard<T>(
  operation: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  if (isOfflineMode()) {
    console.log('[requestInterceptor] Offline: Returning fallback value');
    return fallbackValue;
  }
  return operation();
}
