import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSMSSettings() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // PHASE 2: Fetch provider assignments (platform providers)
  const { data: providerAssignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['sms-provider-assignment', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_provider_assignments')
        .select(`
          id,
          sender_id,
          is_default,
          provider:platform_sms_providers(
            id,
            provider_type,
            is_active
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // PHASE 2: Fetch credit pool
  const { data: creditPool, isLoading: poolLoading } = useQuery({
    queryKey: ['sms-credit-pool', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_sms_credit_pool')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Legacy settings (for backwards compatibility & automation toggles)
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['sms-settings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Legacy quota (fallback if no credit pool)
  const { data: quota } = useQuery({
    queryKey: ['sms-quota', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_quota')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch SMS templates (platform global + tenant overrides)
  const { data: templates } = useQuery({
    queryKey: ['sms-templates', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_sms_templates')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .order('event_key');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch marketplace add-ons (platform add-ons)
  const { data: marketplaceItems } = useQuery({
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

  const saveSettings = useMutation({
    mutationFn: async (settingsData: any) => {
      // Only save automation toggles and sender_id
      const { error } = await supabase
        .from('tenant_sms_settings')
        .upsert(
          {
            tenant_id: tenantId,
            sender_id: settingsData.sender_id,
            enabled: settingsData.enabled,
            auto_send_booking_confirmation: settingsData.auto_send_booking_confirmation,
            auto_send_checkin_reminder: settingsData.auto_send_checkin_reminder,
            auto_send_checkout_reminder: settingsData.auto_send_checkout_reminder,
          },
          {
            onConflict: 'tenant_id',
          }
        );

      if (error) throw error;

      // Update sender_id in provider assignment if exists
      if (providerAssignment?.id) {
        await supabase
          .from('tenant_provider_assignments')
          .update({ sender_id: settingsData.sender_id })
          .eq('id', providerAssignment.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-settings', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['sms-provider-assignment', tenantId] });
      toast.success('SMS settings saved');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async (templateData: any) => {
      const { error } = await supabase
        .from('platform_sms_templates')
        .upsert({
          tenant_id: tenantId,
          event_key: templateData.event_key,
          language: templateData.language || 'en',
          template_body: templateData.template_body,
          is_active: templateData.is_active,
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
      addon_id: string;
      payment_method: string;
      payment_reference: string;
    }) => {
      // Create platform add-on purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from('platform_addon_purchases')
        .insert({
          tenant_id: tenantId,
          addon_id: params.addon_id,
          quantity: 1,
          amount_paid: 0, // TODO: Get from addon pricing
          status: 'completed',
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Get addon details
      const { data: addon } = await supabase
        .from('platform_addons')
        .select('units_available')
        .eq('id', params.addon_id)
        .single();

      if (!addon) throw new Error('Add-on not found');

      // Update credit pool
      const currentPool = creditPool || { total_credits: 0, consumed_credits: 0 };
      const { error: poolError } = await supabase
        .from('platform_sms_credit_pool')
        .upsert({
          tenant_id: tenantId,
          total_credits: currentPool.total_credits + addon.units_available,
          consumed_credits: currentPool.consumed_credits,
          last_topup_at: new Date().toISOString(),
          billing_reference: purchase.id,
        });

      if (poolError) throw poolError;

      return { credits_added: addon.units_available };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sms-credit-pool', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['platform-addons'] });
      toast.success(`${data.credits_added} SMS credits added to your account`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to purchase bundle');
    },
  });

  // Merge credit pool and legacy quota for UI
  const effectiveQuota = creditPool ? {
    quota_total: creditPool.total_credits,
    quota_used: creditPool.consumed_credits,
    quota_reset_date: null,
  } : quota;

  return {
    settings,
    providerAssignment,
    creditPool,
    quota: effectiveQuota,
    templates,
    marketplaceItems,
    isLoading: settingsLoading || assignmentLoading || poolLoading,
    saveSettings,
    saveTemplate,
    purchaseBundle,
  };
}
