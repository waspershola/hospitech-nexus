/**
 * Offline Session Hook - Phase 2
 * React hook for managing offline session state
 * GUARDED: Only runs in Electron context
 */

import { useState, useEffect } from 'react';
import { isElectronContext } from '@/lib/environment/isElectron';
import type { TenantSession } from '@/lib/offline/offlineTypes';

// Lazy import for Electron-only module
let sessionManager: any = null;

export function useOfflineSession() {
  // GUARD: Return dummy values in browser mode
  const inElectron = isElectronContext();
  
  const [session, setSession] = useState<TenantSession | null>(null);
  const [isLoading, setIsLoading] = useState(inElectron); // Only loading in Electron
  const [initialized, setInitialized] = useState(false);

  // Initialize Electron-only modules
  useEffect(() => {
    if (!inElectron) return;
    
    const initModules = async () => {
      try {
        const sessionManagerModule = await import('@/lib/offline/sessionManager');
        sessionManager = sessionManagerModule.sessionManager;
        setInitialized(true);
      } catch (err) {
        console.warn('[useOfflineSession] Failed to load offline modules:', err);
        setIsLoading(false);
      }
    };
    
    initModules();
  }, [inElectron]);

  useEffect(() => {
    if (!inElectron || !initialized || !sessionManager) return;

    // Initialize session on mount
    sessionManager.initializeSession().then((initialSession: TenantSession | null) => {
      setSession(initialSession);
      setIsLoading(false);
    });

    // Subscribe to session changes
    const unsubscribe = sessionManager.subscribe((newSession: TenantSession | null) => {
      setSession(newSession);
    });

    return unsubscribe;
  }, [inElectron, initialized]);

  // Return browser-safe defaults when not in Electron
  if (!inElectron) {
    return {
      session: null,
      isLoading: false,
      tenantId: null,
      userId: null,
      isSessionValid: false,
      hasRole: () => false,
    };
  }

  return {
    session,
    isLoading,
    tenantId: session?.tenant_id || null,
    userId: session?.user_id || null,
    isSessionValid: sessionManager?.isSessionValid?.() ?? false,
    hasRole: (role: string) => sessionManager?.hasRole?.(role) ?? false,
  };
}
