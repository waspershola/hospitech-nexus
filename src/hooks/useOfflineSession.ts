/**
 * Offline Session Hook - Phase 2
 * React hook for managing offline session state
 */

import { useState, useEffect } from 'react';
import { sessionManager } from '@/lib/offline/sessionManager';
import type { TenantSession } from '@/lib/offline/offlineTypes';

export function useOfflineSession() {
  const [session, setSession] = useState<TenantSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize session on mount
    sessionManager.initializeSession().then((initialSession) => {
      setSession(initialSession);
      setIsLoading(false);
    });

    // Subscribe to session changes
    const unsubscribe = sessionManager.subscribe((newSession) => {
      setSession(newSession);
    });

    return unsubscribe;
  }, []);

  return {
    session,
    isLoading,
    tenantId: session?.tenant_id || null,
    userId: session?.user_id || null,
    isSessionValid: sessionManager.isSessionValid(),
    hasRole: (role: string) => sessionManager.hasRole(role),
  };
}
