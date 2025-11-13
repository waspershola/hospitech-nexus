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
  paid_amount: number; // Deprecated - kept for backward compatibility
  settled_amount: number; // New: Successfully paid fees
  failed_amount: number; // New: Failed payment attempts
  waived_amount: number;
  outstanding_amount: number; // New: pending + billed (fees that need payment)
}

export interface PlatformFeeConfigOptions {
  startDate?: Date;
  endDate?: Date;
}

export function usePlatformFeeConfig(tenantId?: string, options?: PlatformFeeConfigOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { startDate, endDate } = options || {};

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
        paid_amount: 0, // Deprecated
        settled_amount: 0,
        failed_amount: 0,
        waived_amount: 0,
        outstanding_amount: 0,
      };

      data.forEach(entry => {
        const amount = Number(entry.fee_amount);
        summary.total_fees += amount;
        
        if (entry.status === 'billed') {
          summary.billed_amount += amount;
        } else if (entry.status === 'pending') {
          summary.pending_amount += amount;
        } else if (entry.status === 'settled') {
          summary.settled_amount += amount;
          summary.paid_amount += amount; // For backward compatibility
        } else if (entry.status === 'failed') {
          summary.failed_amount += amount;
        } else if (entry.status === 'waived') {
          summary.waived_amount += amount;
        }
      });

      // Calculate outstanding fees (fees that need payment)
      summary.outstanding_amount = summary.pending_amount + summary.billed_amount;

      return summary;
    },
    enabled: !!tenantId,
  });

  // Fetch fee ledger entries
  const { data: ledger, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['platform-fee-ledger', tenantId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('platform_fee_ledger')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query
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
