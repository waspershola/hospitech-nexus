import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UsageRecord {
  id: string;
  tenant_id: string;
  metric_type: string;
  total_quantity: number;
  record_count: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  overage_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  line_items: any[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export function usePlatformBillingMetrics() {
  const queryClient = useQueryClient();

  const fetchUsage = (tenantId: string, metricType?: string, startDate?: string, endDate?: string) => {
    return useQuery({
      queryKey: ['billing-usage', tenantId, metricType, startDate, endDate],
      queryFn: async () => {
        const params = new URLSearchParams({
          tenant_id: tenantId,
        });

        if (metricType) params.append('metric_type', metricType);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const { data, error } = await supabase.functions.invoke(
          `track-usage-metrics?${params.toString()}`,
          { method: 'GET' }
        );

        if (error) throw error;
        return data as UsageRecord[];
      },
      enabled: !!tenantId,
    });
  };

  const trackUsage = useMutation({
    mutationFn: async (usageData: {
      tenant_id: string;
      metric_type: string;
      quantity: number;
      metadata?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke('track-usage-metrics', {
        method: 'POST',
        body: usageData,
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      console.error('Failed to track usage:', error);
    },
  });

  const processBillingCycle = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-billing-cycle', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-usage'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      toast.success(`Billing cycle processed. ${data.invoices_generated} invoices generated.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process billing cycle');
    },
  });

  return {
    fetchUsage,
    trackUsage,
    processBillingCycle,
  };
}

export function usePlatformInvoices(tenantId?: string) {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['billing-invoices', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('platform_billing')
        .select('*, platform_tenants(name)')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status, amountPaid }: { id: string; status: string; amountPaid?: number }) => {
      const updateData: any = { status };
      
      if (status === 'paid' && amountPaid !== undefined) {
        updateData.amount_paid = amountPaid;
      }

      const { data, error } = await supabase
        .from('platform_billing')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update invoice');
    },
  });

  return {
    invoices,
    isLoading,
    error,
    updateInvoiceStatus,
  };
}
