import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformPaymentProvider {
  id: string;
  provider_type: 'stripe' | 'monnify' | 'paystack' | 'flutterwave';
  provider_name: string;
  api_key_encrypted?: string;
  api_secret_encrypted?: string;
  webhook_secret?: string;
  config?: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function usePlatformPaymentProviders() {
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['platform-payment-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_payment_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlatformPaymentProvider[];
    },
  });

  const createProvider = useMutation({
    mutationFn: async (providerData: Omit<PlatformPaymentProvider, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('platform_payment_providers')
        .insert(providerData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payment-providers'] });
      toast.success('Payment provider added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add payment provider');
    },
  });

  const updateProvider = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PlatformPaymentProvider>;
    }) => {
      const { data, error } = await supabase
        .from('platform_payment_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payment-providers'] });
      toast.success('Payment provider updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update payment provider');
    },
  });

  const deleteProvider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_payment_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payment-providers'] });
      toast.success('Payment provider deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete payment provider');
    },
  });

  return {
    providers: providers || [],
    isLoading,
    createProvider,
    updateProvider,
    deleteProvider,
  };
}
