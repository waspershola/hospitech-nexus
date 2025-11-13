import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePlatformFee(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['platform-fee-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('platform_fee_configurations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .single();
      
      if (error) {
        console.error('Error fetching platform fee config:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
