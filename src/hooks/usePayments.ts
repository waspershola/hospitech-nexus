import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  tenant_id: string;
  booking_id: string | null;
  guest_id: string | null;
  organization_id: string | null;
  amount: number;
  expected_amount: number | null;
  payment_type: string | null;
  currency: string;
  method: string | null;
  method_provider: string | null;
  provider_reference: string | null;
  transaction_ref: string | null;
  department: string | null;
  location: string | null;
  wallet_id: string | null;
  recorded_by: string | null;
  status: 'pending' | 'paid' | 'success' | 'completed' | 'failed' | 'refunded';
  metadata: Record<string, any>;
  created_at: string;
}

export function usePayments(bookingId?: string) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['payments', tenantId, bookingId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'tenant_id' | 'created_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      // Create payment record
      const { data: paymentData, error } = await supabase
        .from('payments')
        .insert([{ ...payment, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Post to folio if payment is linked to a booking with open folio
      if (paymentData.booking_id) {
        const { data: folio } = await supabase
          .from('stay_folios')
          .select('id')
          .eq('booking_id', paymentData.booking_id)
          .eq('status', 'open')
          .maybeSingle();
        
        if (folio) {
          const { error: folioError } = await supabase.rpc('folio_post_payment', {
            p_folio_id: folio.id,
            p_payment_id: paymentData.id,
            p_amount: paymentData.amount
          });
          
          if (folioError) {
            console.error('[usePayments] Failed to post to folio:', folioError);
            // Don't fail the payment, just log the error
          }
        }
      }
      
      return paymentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', tenantId] });
      toast.success('Payment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment: ${error.message}`);
    },
  });

  return {
    payments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createPayment: createMutation.mutate,
    updatePayment: updateMutation.mutate,
  };
}
