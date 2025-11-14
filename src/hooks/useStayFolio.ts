import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface StayFolio {
  id: string;
  tenant_id: string;
  booking_id: string | null;
  room_id: string | null;
  guest_id: string | null;
  status: 'open' | 'closed' | 'cancelled';
  balance: number;
  total_charges: number;
  total_payments: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FolioTransaction {
  id: string;
  transaction_type: 'charge' | 'payment' | 'adjustment' | 'refund';
  amount: number;
  description: string;
  department: string | null;
  created_at: string;
}

export function useStayFolio(folioId: string | null) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to real-time folio updates
  useEffect(() => {
    if (!folioId || !tenantId) return;

    const channel = supabase
      .channel(`folio-${folioId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stay_folios',
          filter: `id=eq.${folioId}`,
        },
        (payload) => {
          console.log('[folio] Real-time update:', payload.new);
          queryClient.setQueryData(['folio', folioId], payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folioId, tenantId, queryClient]);

  return useQuery({
    queryKey: ['folio', folioId],
    queryFn: async () => {
      if (!folioId) return null;

      const { data, error } = await supabase
        .from('stay_folios')
        .select(`
          *,
          booking:bookings(*),
          guest:guests(*),
          room:rooms(*),
          transactions:folio_transactions(*)
        `)
        .eq('id', folioId)
        .single();

      if (error) throw error;
      return data as StayFolio & {
        booking: any;
        guest: any;
        room: any;
        transactions: FolioTransaction[];
      };
    },
    enabled: !!folioId && !!tenantId,
  });
}
