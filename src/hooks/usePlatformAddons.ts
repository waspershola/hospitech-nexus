import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlatformAddons() {
  const queryClient = useQueryClient();

  const { data: addons, isLoading } = useQuery({
    queryKey: ['platform-addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_addons')
        .select('*')
        .order('pricing->amount');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['platform-addon-purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_addon_purchases')
        .select(`
          *,
          addon:platform_addons(*),
          tenant:platform_tenants(tenant_id, name)
        `)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createAddon = useMutation({
    mutationFn: async (addonData: {
      key: string;
      title: string;
      description?: string;
      units_available: number;
      pricing: any;
    }) => {
      const { data, error } = await supabase
        .from('platform_addons')
        .insert(addonData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-addons'] });
      toast.success('Add-on created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create add-on');
    },
  });

  const updateAddon = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<{
        title: string;
        description: string;
        units_available: number;
        pricing: any;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('platform_addons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-addons'] });
      toast.success('Add-on updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update add-on');
    },
  });

  return {
    addons,
    purchases,
    isLoading: isLoading || purchasesLoading,
    createAddon,
    updateAddon,
  };
}
