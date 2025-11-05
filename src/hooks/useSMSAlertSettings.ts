import { useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSMSAlertSettings() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['sms-alert-settings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_alert_settings')
        .select('*')
        .eq('tenant_id', tenantId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: alertLogs } = useQuery({
    queryKey: ['sms-alert-logs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_alert_logs')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const saveSettings = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from('tenant_sms_alert_settings')
        .upsert({
          tenant_id: tenantId,
          ...values,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-alert-settings', tenantId] });
      toast.success('Alert settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save alert settings');
    },
  });

  const checkQuota = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-sms-quota-alerts', {
        body: { tenant_id: tenantId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sms-alert-logs', tenantId] });
      
      if (data.alert_sent) {
        toast.success(`Alert sent! ${data.notifications_sent} notification(s) delivered`);
      } else {
        toast.info(data.message || 'Quota check completed');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to check quota');
    },
  });

  return {
    settings,
    alertLogs,
    isLoading,
    saveSettings,
    checkQuota,
  };
}
