import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlatformBilling() {
  const queryClient = useQueryClient();

  const runBillingCycle = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('billing-cycle', {
        method: 'POST',
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Billing cycle completed: ${data.processed} invoices generated`);
      queryClient.invalidateQueries({ queryKey: ['platform-billing'] });
      queryClient.invalidateQueries({ queryKey: ['platform-billing-summary'] });
    },
    onError: (error: any) => {
      console.error('Billing cycle error:', error);
      toast.error('Failed to run billing cycle');
    },
  });

  const trackUsage = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data, error } = await supabase.functions.invoke('track-usage', {
        method: 'POST',
        body: { tenant_id: tenantId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Usage tracked successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-usage'] });
    },
    onError: (error: any) => {
      console.error('Usage tracking error:', error);
      toast.error('Failed to track usage');
    },
  });

  return {
    runBillingCycle,
    trackUsage,
  };
}
