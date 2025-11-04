import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OperationsHours {
  checkInTime: string;
  checkOutTime: string;
}

export function useOperationsHours() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['operations-hours', tenantId],
    queryFn: async (): Promise<OperationsHours> => {
      if (!tenantId) {
        return { checkInTime: '14:00', checkOutTime: '12:00' };
      }

      const { data } = await supabase
        .from('hotel_configurations')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .in('key', ['check_in_time', 'check_out_time']);

      const checkInConfig = data?.find(c => c.key === 'check_in_time');
      const checkOutConfig = data?.find(c => c.key === 'check_out_time');

      return {
        checkInTime: checkInConfig?.value ? String(checkInConfig.value).replace(/"/g, '') : '14:00',
        checkOutTime: checkOutConfig?.value ? String(checkOutConfig.value).replace(/"/g, '') : '12:00',
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
