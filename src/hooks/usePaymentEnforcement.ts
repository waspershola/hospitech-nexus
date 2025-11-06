import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePaymentEnforcement() {
  const queryClient = useQueryClient();

  // Fetch overdue invoices
  const { data: overdueInvoices, isLoading } = useQuery({
    queryKey: ['overdue-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_invoices')
        .select(`
          *,
          tenants(name, status),
          tenant_subscriptions(status)
        `)
        .in('status', ['pending', 'overdue'])
        .lte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Run payment enforcement
  const runEnforcement = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('payment-enforcement', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Enforcement complete: ${data.reminders_sent} reminders sent, ${data.tenants_suspended} tenants suspended`
      );
      queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run enforcement';
      toast.error(errorMessage);
    },
  });

  // Reactivate suspended tenant
  const reactivateTenant = useMutation({
    mutationFn: async ({ tenantId, invoiceId }: { tenantId: string; invoiceId: string }) => {
      // Mark invoice as paid
      const { error: invoiceError } = await supabase
        .from('platform_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Reactivate tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ 
          status: 'active',
          metadata: {},
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      // Reactivate subscription
      const { error: subError } = await supabase
        .from('tenant_subscriptions')
        .update({ status: 'active' })
        .eq('tenant_id', tenantId);

      if (subError) throw subError;
    },
    onSuccess: () => {
      toast.success('Tenant reactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['platform-invoices'] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate tenant';
      toast.error(errorMessage);
    },
  });

  // Calculate statistics
  const stats = {
    totalOverdue: overdueInvoices?.length || 0,
    suspendedTenants: overdueInvoices?.filter((inv: any) => inv.tenants?.status === 'suspended').length || 0,
    totalOverdueAmount: overdueInvoices?.reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0) || 0,
    criticalCount: overdueInvoices?.filter((inv: any) => {
      const daysPastDue = Math.floor(
        (new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysPastDue >= 7;
    }).length || 0,
  };

  return {
    overdueInvoices,
    isLoading,
    stats,
    runEnforcement,
    reactivateTenant,
    isRunning: runEnforcement.isPending,
  };
}
