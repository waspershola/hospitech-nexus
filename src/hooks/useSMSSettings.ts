import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSMSSettings() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['sms-settings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: quota, isLoading: quotaLoading } = useQuery({
    queryKey: ['sms-quota', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_quota')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: templates } = useQuery({
    queryKey: ['sms-templates', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('event_key');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: marketplaceItems } = useQuery({
    queryKey: ['sms-marketplace-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_marketplace_items')
        .select('*')
        .eq('is_active', true)
        .order('price_amount');

      if (error) throw error;
      return data || [];
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (settingsData: any) => {
      const { error } = await supabase
        .from('tenant_sms_settings')
        .upsert(
          {
            tenant_id: tenantId,
            ...settingsData,
          },
          {
            onConflict: 'tenant_id',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-settings', tenantId] });
      toast.success('SMS settings saved');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async (templateData: any) => {
      const { error } = await supabase
        .from('sms_templates')
        .upsert({
          tenant_id: tenantId,
          ...templateData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates', tenantId] });
      toast.success('Template saved');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const purchaseBundle = useMutation({
    mutationFn: async (params: {
      marketplace_item_id: string;
      payment_method: string;
      payment_reference: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('purchase-sms-bundle', {
        body: {
          tenant_id: tenantId,
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sms-quota', tenantId] });
      toast.success(`${data.credits_added} SMS credits added to your account`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  return {
    settings,
    quota,
    templates,
    marketplaceItems,
    isLoading: settingsLoading || quotaLoading,
    saveSettings,
    saveTemplate,
    purchaseBundle,
  };
}
