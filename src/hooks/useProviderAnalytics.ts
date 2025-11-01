import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProviderStats {
  provider_id: string;
  provider_name: string;
  total_transactions: number;
  total_amount: number;
  success_rate: number;
  avg_transaction_amount: number;
  peak_hour?: number;
  total_reconciled: number;
  reconciliation_rate: number;
}

export function useProviderAnalytics(startDate?: Date, endDate?: Date) {
  const { tenantId } = useAuth();
  
  return useQuery({
    queryKey: ['provider-analytics', tenantId, startDate, endDate],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let paymentsQuery = supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (startDate) {
        paymentsQuery = paymentsQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        paymentsQuery = paymentsQuery.lte('created_at', endDate.toISOString());
      }
      
      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;
      
      const { data: providers, error: providersError } = await supabase
        .from('finance_providers')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (providersError) throw providersError;
      
      // Group by provider
      const providerMap = new Map<string, ProviderStats>();
      
      providers?.forEach(provider => {
        providerMap.set(provider.id, {
          provider_id: provider.id,
          provider_name: provider.name,
          total_transactions: 0,
          total_amount: 0,
          success_rate: 0,
          avg_transaction_amount: 0,
          total_reconciled: 0,
          reconciliation_rate: 0,
        });
      });
      
      payments?.forEach(payment => {
        const providerId = payment.method_provider || 'unknown';
        const stats = providerMap.get(providerId);
        
        if (stats) {
          stats.total_transactions++;
          stats.total_amount += Number(payment.amount);
          
          if (payment.status === 'paid' || payment.status === 'success') {
            stats.success_rate++;
          }
          
          if (payment.metadata && typeof payment.metadata === 'object' && 'reconciled' in payment.metadata) {
            stats.total_reconciled++;
          }
        }
      });
      
      // Calculate averages and rates
      providerMap.forEach(stats => {
        if (stats.total_transactions > 0) {
          stats.avg_transaction_amount = stats.total_amount / stats.total_transactions;
          stats.success_rate = (stats.success_rate / stats.total_transactions) * 100;
          stats.reconciliation_rate = (stats.total_reconciled / stats.total_transactions) * 100;
        }
      });
      
      return Array.from(providerMap.values()).sort((a, b) => b.total_amount - a.total_amount);
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
