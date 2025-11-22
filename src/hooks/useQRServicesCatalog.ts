import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface QRService {
  id: string;
  tenant_id: string;
  service_key: string;
  service_label: string;
  category: string | null;
  active: boolean;
  display_order: number;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export function useQRServicesCatalog() {
  const { tenantId } = useAuth();

  return useQuery<QRService[]>({
    queryKey: ['qr-services-catalog', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Using any to bypass type checking for new table not yet in Supabase types
      const { data, error } = await (supabase as any)
        .from('hotel_qr_services_catalog')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('display_order');

      if (error) throw error;
      return (data || []) as QRService[];
    },
    enabled: !!tenantId,
  });
}
