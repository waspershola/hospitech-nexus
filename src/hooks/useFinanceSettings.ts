import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { HotelFinancials } from '@/lib/finance/types';

export function useFinanceSettings() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['finance-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('hotel_financials')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Return defaults if no settings exist
      return data || {
        vat_rate: 0,
        vat_inclusive: false,
        service_charge: 0,
        service_charge_inclusive: false,
        currency: 'NGN',
        currency_symbol: '₦',
        symbol_position: 'before',
        decimal_separator: '.',
        thousand_separator: ',',
        decimal_places: 2,
      } as HotelFinancials;
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<HotelFinancials>) => {
      if (!tenantId) throw new Error('No tenant ID');

      // Get existing record
      const { data: existing } = await supabase
        .from('hotel_financials')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      console.log('💾 Saving finance settings:', updates);
      
      const { data, error } = await supabase
        .from('hotel_financials')
        .upsert({
          ...(existing?.id && { id: existing.id }),
          tenant_id: tenantId,
          ...updates,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving finance settings:', error);
        throw error;
      }
      
      console.log('✅ Finance settings saved:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-settings', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['hotel-financials', tenantId] });
      toast.success('Finance settings saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
