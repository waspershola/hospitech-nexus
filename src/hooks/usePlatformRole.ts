import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isElectronContext } from '@/lib/environment/isElectron';

export function usePlatformRole() {
  const { user } = useAuth();
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlatformRole() {
      if (!user?.id) {
        setPlatformRole(null);
        setIsLoading(false);
        return;
      }

      // Phase 14: Check for offline mode in Electron - use cached session state
      if (isElectronContext() && !navigator.onLine) {
        const api = (window as any).electronAPI;
        if (api?.offlineApi?.offlineData?.getSessionState) {
          try {
            const cachedSession = await api.offlineApi.offlineData.getSessionState(user.id);
            if (cachedSession?.platformRole) {
              console.log('[usePlatformRole] Offline: Using cached role...', cachedSession.platformRole);
              setPlatformRole(cachedSession.platformRole);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('[usePlatformRole] Offline cache read failed:', e);
          }
        }
        console.log('[usePlatformRole] Offline: No cached role, returning null');
        setPlatformRole(null);
        setIsLoading(false);
        return;
      }

      try {
        // Using any to bypass TypeScript complexity with platform_users table
        const { data, error } = await (supabase as any)
          .from('platform_users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching platform role:', error);
        }

        setPlatformRole(data?.role || null);
      } catch (err) {
        console.error('Failed to fetch platform role:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlatformRole();
  }, [user?.id]);

  const platformRoles = ['super_admin', 'admin', 'support_admin', 'billing_admin', 'marketplace_admin'];
  const isPlatformAdmin = platformRole ? platformRoles.includes(platformRole) : false;
  const isSuperAdmin = platformRole === 'super_admin';

  return {
    platformRole,
    isPlatformAdmin,
    isSuperAdmin,
    isLoading,
  };
}
