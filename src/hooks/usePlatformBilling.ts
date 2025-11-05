import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlatformBilling(tenantId?: string) {
  const queryClient = useQueryClient();

  // Get invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['platform-invoices', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('platform_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Get usage records
  const { data: usageRecords, isLoading: usageLoading } = useQuery({
    queryKey: ['platform-usage', tenantId],
    queryFn: async () => {
      const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      
      let query = supabase
        .from('platform_usage_records')
        .select('*')
        .gte('period_start', startDate)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Sync usage
  const syncUsage = useMutation({
    mutationFn: async (dateRange?: { start: string; end: string }) => {
      const { data, error } = await supabase.functions.invoke('platform-usage-sync', {
        body: {
          action: 'sync_sms_usage',
          date_range: dateRange,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-usage'] });
      toast.success('Usage synced successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sync usage');
    },
  });

  // Mark invoice as paid
  const markInvoicePaid = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('platform_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
      toast.success('Invoice marked as paid');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update invoice');
    },
  });

  // Calculate summary statistics
  const summary = invoices ? {
    total: invoices.length,
    pending: invoices.filter(inv => inv.status === 'pending').length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    overdue: invoices.filter(inv => 
      inv.status === 'pending' && new Date(inv.due_date) < new Date()
    ).length,
    totalAmount: invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
    pendingAmount: invoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0),
  } : null;

  return {
    invoices,
    usageRecords,
    summary,
    isLoading: invoicesLoading || usageLoading,
    syncUsage,
    markInvoicePaid,
    isSyncing: syncUsage.isPending,
  };
}
