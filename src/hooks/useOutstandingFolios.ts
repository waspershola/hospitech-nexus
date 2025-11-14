import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OutstandingFolio {
  id: string;
  booking_id: string;
  room_id: string;
  guest_id: string;
  balance: number;
  total_charges: number;
  total_payments: number;
  created_at: string;
  booking?: {
    booking_reference: string;
    check_in: string;
    check_out: string;
  };
  guest?: {
    name: string;
    phone: string;
    email: string;
  };
  room?: {
    number: string;
    type: string;
  };
}

export function useOutstandingFolios() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['outstanding-folios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('stay_folios')
        .select(`
          *,
          booking:bookings(booking_reference, check_in, check_out),
          guest:guests(name, phone, email),
          room:rooms(number, type)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .gt('balance', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OutstandingFolio[];
    },
    enabled: !!tenantId,
  });
}
