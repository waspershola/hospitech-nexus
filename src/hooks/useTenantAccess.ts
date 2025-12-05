import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isElectronContext } from '@/lib/environment/isElectron';

export function useTenantAccess() {
  const { tenantId, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !tenantId || !user) return;

    const checkTenantAccess = async () => {
      // Phase 14B: Skip tenant access check when offline in Electron
      if (isElectronContext() && !navigator.onLine) {
        console.log('[useTenantAccess] Offline: Skipping tenant access check - assuming allowed');
        return;
      }

      try {
        const { data, error } = await supabase.rpc('check_tenant_access', {
          _tenant_id: tenantId
        });

        if (error) {
          console.error('Error checking tenant access:', error);
          return;
        }

        const result = data as { allowed: boolean; message?: string };

        if (!result?.allowed) {
          toast.error('Account Suspended', {
            description: result?.message || 'Your account is currently suspended.',
            duration: 10000,
          });
          
          // Sign out user
          await supabase.auth.signOut();
          navigate('/auth/login', { replace: true });
        }
      } catch (err) {
        console.error('Tenant access check failed:', err);
      }
    };

    checkTenantAccess();
  }, [tenantId, user, loading, navigate]);
}
