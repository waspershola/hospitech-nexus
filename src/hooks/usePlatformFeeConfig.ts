import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlatformFeeConfig {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  applies_to: string[];
  mode: 'inclusive' | 'exclusive';
  payer: 'guest' | 'property';
  fee_type: 'percentage' | 'flat';
  booking_fee: number;
  qr_fee: number;
  billing_cycle: 'realtime' | 'monthly';
  trial_days: number;
  trial_exemption_enabled: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeSummary {
  total_fees: number;
  billed_amount: number;
  pending_amount: number;
  paid_amount: number;
  waived_amount: number;
}

export function usePlatformFeeConfig(tenantId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch fee configuration(s)
  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['platform-fee-configs', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('platform_fee_configurations')
        .select(`
          *,
          tenant:tenants!platform_fee_configurations_tenant_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(config => ({
        ...config,
        tenant_name: config.tenant?.name
      })) as PlatformFeeConfig[];
    },
    enabled: true,
  });

  // Fetch fee summary for a tenant
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['platform-fee-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('platform_fee_ledger')
        .select('fee_amount, status')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const summary: FeeSummary = {
        total_fees: 0,
        billed_amount: 0,
        pending_amount: 0,
        paid_amount: 0,
        waived_amount: 0,
      };

      data.forEach(entry => {
        summary.total_fees += entry.fee_amount;
        if (entry.status === 'billed') {
          summary.billed_amount += entry.fee_amount;
        } else if (entry.status === 'pending') {
          summary.pending_amount += entry.fee_amount;
        } else if (entry.status === 'paid') {
          summary.paid_amount += entry.fee_amount;
        } else if (entry.status === 'waived') {
          summary.waived_amount += entry.fee_amount;
        }
      });

      return summary;
    },
    enabled: !!tenantId,
  });

  // Fetch fee ledger entries
  const { data: ledger, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['platform-fee-ledger', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('platform_fee_ledger')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Update fee configuration
  const updateConfig = useMutation({
    mutationFn: async ({
      configId,
      updates,
    }: {
      configId: string;
      updates: Partial<PlatformFeeConfig>;
    }) => {
      const { data, error } = await supabase
        .from('platform_fee_configurations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', configId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-configs'] });
      toast({
        title: 'Success',
        description: 'Fee configuration updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    configs,
    config: configs?.[0] || null,
    summary,
    ledger,
    isLoading: isLoadingConfigs || isLoadingSummary || isLoadingLedger,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
}
