import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTenantSMSCredits() {
  const { user } = useAuth();

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ['tenant-sms-credits', user?.id],
    queryFn: async () => {
      // Get user's tenant
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!userRole?.tenant_id) return null;

      // Get SMS credits
      const { data, error } = await supabase
        .from('tenant_sms_credits')
        .select('*')
        .eq('tenant_id', userRole.tenant_id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data || {
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
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!userRole?.tenant_id) return [];

      // Get purchases
      const { data, error } = await supabase
        .from('platform_addon_purchases')
        .select('*, addon:addon_id(*)')
        .eq('tenant_id', userRole.tenant_id)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    credits,
    purchases,
    isLoading: creditsLoading || purchasesLoading,
  };
}
