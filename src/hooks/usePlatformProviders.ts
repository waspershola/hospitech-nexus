import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlatformProviders() {
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['platform-sms-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_sms_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createProvider = useMutation({
    mutationFn: async (providerData: {
      provider_type: string;
      api_key_encrypted: string;
      api_secret_encrypted?: string;
      default_sender_id?: string;
      config?: any;
      is_active: boolean;
    }) => {
      const { data, error } = await supabase
        .from('platform_sms_providers')
        .insert(providerData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-sms-providers'] });
      toast.success('SMS provider created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create provider');
    },
  });

  const updateProvider = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        provider_type: string;
        api_key_encrypted: string;
        api_secret_encrypted: string;
        default_sender_id: string;
        config: any;
        is_active: boolean;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('platform_sms_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-sms-providers'] });
      toast.success('Provider updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update provider');
    },
  });

  const deleteProvider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_sms_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-sms-providers'] });
      toast.success('Provider deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete provider');
    },
  });

  return {
    providers,
    isLoading,
    createProvider,
    updateProvider,
    deleteProvider,
  };
}
