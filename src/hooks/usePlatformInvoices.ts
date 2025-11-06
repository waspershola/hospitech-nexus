import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlatformInvoices(tenantId?: string) {
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['platform-invoices', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('platform_invoices')
        .select(`
          *,
          tenants(name),
          tenant_subscriptions(
            platform_plans(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Generate invoices mutation
  const generateInvoices = useMutation({
    mutationFn: async ({ tenantId, month, year }: { tenantId?: string; month?: number; year?: number }) => {
      const { data, error } = await supabase.functions.invoke('platform-invoice-generator', {
        body: { tenantId, month, year },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data.invoicesGenerated} invoices`);
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoices';
      toast.error(errorMessage);
    },
  });

  // Mark invoice as paid mutation
  const markAsPaid = useMutation({
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
      toast.success('Invoice marked as paid');
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice';
      toast.error(errorMessage);
    },
  });

  // Calculate summary statistics
  const summary = {
    total: invoices?.length || 0,
    pending: invoices?.filter((inv) => inv.status === 'pending').length || 0,
    paid: invoices?.filter((inv) => inv.status === 'paid').length || 0,
    overdue: invoices?.filter((inv) => inv.status === 'overdue').length || 0,
    totalAmount: invoices?.reduce((sum, inv) => sum + Number((inv as any).amount), 0) || 0,
    pendingAmount: invoices?.filter((inv) => inv.status === 'pending').reduce((sum, inv) => sum + Number((inv as any).amount), 0) || 0,
    paidAmount: invoices?.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + Number((inv as any).amount), 0) || 0,
  };

  return {
    invoices,
    isLoading,
    summary,
    generateInvoices,
    markAsPaid,
    isGenerating: generateInvoices.isPending,
  };
}
