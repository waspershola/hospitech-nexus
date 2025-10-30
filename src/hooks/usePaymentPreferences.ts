import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PaymentPreferences {
  id?: string;
  tenant_id: string;
  allow_checkout_with_debt: boolean;
  auto_apply_wallet_on_booking: boolean;
  overpayment_default_action: 'wallet' | 'prompt' | 'refund';
  manager_approval_threshold: number;
  receivable_aging_days: number;
  large_overpayment_threshold: number;
  created_at?: string;
  updated_at?: string;
}

export function usePaymentPreferences() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['payment-preferences', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('hotel_payment_preferences')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Return defaults if no preferences exist
      if (!data) {
        return {
          tenant_id: tenantId,
          allow_checkout_with_debt: false,
          auto_apply_wallet_on_booking: true,
          overpayment_default_action: 'wallet' as const,
          manager_approval_threshold: 50000,
          receivable_aging_days: 30,
          large_overpayment_threshold: 50000,
        };
      }
      
      return data as PaymentPreferences;
    },
    enabled: !!tenantId,
  });

  const updateMutation = useMutation({
    mutationFn: async (preferences: Partial<PaymentPreferences>) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('hotel_payment_preferences')
        .upsert({
          tenant_id: tenantId,
          ...preferences,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-preferences', tenantId] });
      toast.success('Payment preferences updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}