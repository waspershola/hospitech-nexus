import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformFeePayment {
  id: string;
  tenant_id: string;
  payment_reference: string;
  total_amount: number;
  payment_method_id: string | null;
  provider: string | null;
  status: 'initiated' | 'processing' | 'successful' | 'failed' | 'refunded';
  ledger_ids: string[];
  provider_response: any;
  metadata: any;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
  failed_at: string | null;
}

export function useTenantPaymentHistory(tenantId?: string) {
  return useQuery({
    queryKey: ['tenant-payment-history', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      console.log('[useTenantPaymentHistory] Fetching payment history for tenant:', tenantId);

      const { data, error } = await supabase
        .from('platform_fee_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useTenantPaymentHistory] Error fetching payments:', error);
        throw error;
      }

      console.log('[useTenantPaymentHistory] Found', data?.length || 0, 'payment records');
      return data as PlatformFeePayment[];
    },
    enabled: !!tenantId,
  });
}
