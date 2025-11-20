// HOTEL-SERVICES-V1: Hook for fetching database-driven hotel services
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HotelService {
  id: string;
  tenant_id: string;
  category: 'room_service' | 'bar' | 'fb' | 'spa' | 'laundry' | 'minibar' | 'transport' | 'misc';
  name: string;
  description: string | null;
  default_amount: number;
  taxable: boolean;
  active: boolean;
  display_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useHotelServices() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['hotel-services', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('hotel_services')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[HOTEL-SERVICES-V1] Error fetching services:', error);
        throw error;
      }
      
      return data as HotelService[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
