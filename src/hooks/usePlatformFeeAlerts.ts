import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformFeeAlert {
  id: string;
  rule_id: string;
  alert_type: 'threshold_breach' | 'unusual_pattern' | 'zero_revenue';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  current_value: number;
  expected_value: number | null;
  threshold_value: number | null;
  period_start: string;
  period_end: string;
  tenant_id: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  metadata: any;
  created_at: string;
  tenant?: {
    name: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  period: 'daily' | 'weekly' | 'monthly';
  metric: 'total_revenue' | 'booking_revenue' | 'qr_revenue' | 'tenant_revenue';
  threshold_type: 'absolute' | 'percentage_drop';
  threshold_value: number;
  comparison_period: string | null;
  tenant_id: string | null;
  active: boolean;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlatformFeeAlerts() {
  const queryClient = useQueryClient();

  // Fetch all alerts
  const alerts = useQuery({
    queryKey: ['platform-fee-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_fee_alerts')
        .select(`
          *,
          tenant:tenants(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching platform fee alerts:', error);
        throw error;
      }

      return data as PlatformFeeAlert[];
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch unacknowledged alerts count
  const unacknowledgedCount = useQuery({
    queryKey: ['platform-fee-alerts-unacknowledged-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('platform_fee_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('acknowledged', false);

      if (error) {
        console.error('Error fetching unacknowledged alerts count:', error);
        throw error;
      }

      return count || 0;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch alert rules
  const rules = useQuery({
    queryKey: ['platform-fee-alert-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_fee_alert_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alert rules:', error);
        throw error;
      }

      return data as AlertRule[];
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('platform_fee_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-alerts-unacknowledged-count'] });
      toast.success('Alert acknowledged');
    },
    onError: (error: any) => {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    },
  });

  // Create/update alert rule mutation
  const saveRule = useMutation({
    mutationFn: async (rule: Partial<AlertRule>) => {
      if (rule.id) {
        const { error } = await supabase
          .from('platform_fee_alert_rules')
          .update(rule as any)
          .eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_fee_alert_rules')
          .insert([rule as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-alert-rules'] });
      toast.success('Alert rule saved');
    },
    onError: (error: any) => {
      console.error('Error saving alert rule:', error);
      toast.error('Failed to save alert rule');
    },
  });

  // Delete alert rule mutation
  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('platform_fee_alert_rules')
        .delete()
        .eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-alert-rules'] });
      toast.success('Alert rule deleted');
    },
    onError: (error: any) => {
      console.error('Error deleting alert rule:', error);
      toast.error('Failed to delete alert rule');
    },
  });

  // Trigger manual check
  const triggerCheck = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('check-platform-fee-alerts');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-alert-rules'] });
      toast.success('Alert check triggered');
    },
    onError: (error: any) => {
      console.error('Error triggering alert check:', error);
      toast.error('Failed to trigger alert check');
    },
  });

  return {
    alerts,
    unacknowledgedCount,
    rules,
    acknowledgeAlert,
    saveRule,
    deleteRule,
    triggerCheck,
  };
}
