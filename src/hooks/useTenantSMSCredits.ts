import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function useTenantSMSCredits() {
  const { user } = useAuth();

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ['tenant-sms-credits', user?.id],
    queryFn: async () => {
      // Use fetch directly to avoid TypeScript issues with new table
      const userRoleUrl = `https://akchmpmzcupzjaeewdui.supabase.co/rest/v1/user_roles?user_id=eq.${user?.id}&select=tenant_id`;
      const userRoleResponse = await fetch(userRoleUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
        },
      });

      const userRoles = await userRoleResponse.json();
      const userRole = userRoles[0];

      if (!userRole?.tenant_id) {
        return {
          credits_available: 0,
          credits_used: 0,
          total_purchased: 0,
        };
      }

      // Get SMS credits
      const creditsUrl = `https://akchmpmzcupzjaeewdui.supabase.co/rest/v1/tenant_sms_credits?tenant_id=eq.${userRole.tenant_id}`;
      const creditsResponse = await fetch(creditsUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
        },
      });

      const credits = await creditsResponse.json();
      const creditData = credits[0];
      
      return creditData || {
        credits_available: 0,
        credits_used: 0,
        total_purchased: 0,
      };
    },
    enabled: !!user?.id,
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['tenant-addon-purchases', user?.id],
    queryFn: async () => {
      // Get user's tenant
      const userRoleUrl = `https://akchmpmzcupzjaeewdui.supabase.co/rest/v1/user_roles?user_id=eq.${user?.id}&select=tenant_id`;
      const userRoleResponse = await fetch(userRoleUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
        },
      });

      const userRoles = await userRoleResponse.json();
      const userRole = userRoles[0];

      if (!userRole?.tenant_id) return [];

      // Get purchases with addon data
      const purchasesUrl = `https://akchmpmzcupzjaeewdui.supabase.co/rest/v1/platform_addon_purchases?tenant_id=eq.${userRole.tenant_id}&select=*,addon:addon_id(*)&order=purchased_at.desc`;
      const purchasesResponse = await fetch(purchasesUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
        },
      });

      const purchases = await purchasesResponse.json();
      return purchases || [];
    },
    enabled: !!user?.id,
  });

  return {
    credits,
    purchases,
    isLoading: creditsLoading || purchasesLoading,
  };
}
