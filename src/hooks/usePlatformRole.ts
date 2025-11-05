import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  const isPlatformAdmin = platformRole === 'super_admin' || platformRole === 'admin';
  const isSuperAdmin = platformRole === 'super_admin';

  return {
    platformRole,
    isPlatformAdmin,
    isSuperAdmin,
    isLoading,
  };
}
