import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface TodayPayment {
  id: string;
  created_at: string;
  amount: number;
  method: string | null;
  method_provider: string | null;
  department: string | null;
  payment_type: string | null;
  status: string | null;
  booking_id: string | null;
  organization_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  org_name: string | null;
  room_number: string | null;
  staff_name: string | null;
  tenant_id: string;
}

export function useTodayPayments() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['today-payments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_today_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TodayPayment[];
    },
    enabled: !!tenantId,
  });

  // Real-time subscription to payments table
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('today-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          // Refetch today's payments when a new payment is inserted
          queryClient.invalidateQueries({ queryKey: ['today-payments', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return query;
}
