import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  method_name: string;
  method_type: 'cash' | 'card' | 'transfer' | 'mobile_money' | 'cheque' | 'pos' | 'online';
  provider_id: string | null;
  active: boolean;
  display_order: number;
  requires_reference: boolean;
  requires_approval: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function usePaymentMethods() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['payment-methods', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('[usePaymentMethods] Error fetching methods:', error);
        throw error;
      }
      
      return (data || []) as PaymentMethod[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (method: Omit<PaymentMethod, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{ ...method, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      return data as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', tenantId] });
      toast.success('Payment method created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create payment method: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentMethod> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as PaymentMethod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', tenantId] });
      toast.success('Payment method updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment method: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', tenantId] });
      toast.success('Payment method deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete payment method: ${error.message}`);
    },
  });

  return {
    paymentMethods: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createPaymentMethod: createMutation.mutate,
    updatePaymentMethod: updateMutation.mutate,
    deletePaymentMethod: deleteMutation.mutate,
  };
}
