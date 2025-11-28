import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LedgerFilters } from '@/types/ledger';

export interface LedgerStats {
  totalRevenue: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  totalPOS: number;
  totalTransfer: number;
  byDepartment: { department: string; total: number }[];
  byPaymentMethod: { method: string; total: number }[];
  transactionCount: number;
}

export function useLedgerStats(filters: LedgerFilters) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['ledger-stats', tenantId, filters],
    queryFn: async (): Promise<LedgerStats> => {
      if (!tenantId) {
        return {
          totalRevenue: 0,
          totalRefunds: 0,
          totalCash: 0,
          totalCard: 0,
          totalPOS: 0,
          totalTransfer: 0,
          byDepartment: [],
          byPaymentMethod: [],
          transactionCount: 0,
        };
      }

      // FINANCE-CONFIG-V1: Use JOIN-based queries with payment_methods table for KPIs
      // Build base query with payment method JOIN for proper method_type grouping
      let query = supabase
        .from('ledger_entries')
        .select(`
          amount, 
          transaction_type, 
          department, 
          status,
          payment_method_id,
          payment_methods!payment_method_id (
            method_type,
            method_name
          )
        `)
        .eq('tenant_id', tenantId);

      // Apply same filters as main ledger query
      if (filters.dateFrom) {
        // If datetime-local format (has time), use as-is; otherwise append start of day
        const fromDate = filters.dateFrom.includes('T') 
          ? filters.dateFrom 
          : filters.dateFrom + 'T00:00:00';
        query = query.gte('created_at', fromDate);
      }
      if (filters.dateTo) {
        // If datetime-local format (has time), use as-is; otherwise append end of day
        const toDate = filters.dateTo.includes('T') 
          ? filters.dateTo 
          : filters.dateTo + 'T23:59:59';
        query = query.lte('created_at', toDate);
      }
      if (filters.transactionType?.length) {
        query = query.in('transaction_type', filters.transactionType as any);
      }
      if (filters.paymentMethodId) {
        query = query.eq('payment_method_id', filters.paymentMethodId);
      }
      if (filters.department?.length) {
        query = query.in('department', filters.department);
      }
      if (filters.status?.length) {
        query = query.in('status', filters.status as any);
      }
      if (filters.reconciliationStatus?.length) {
        query = query.in('reconciliation_status', filters.reconciliationStatus as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      const entries = data || [];

      // Calculate stats using method_type from joined payment_methods table
      const totalRevenue = entries
        .filter((e) => e.transaction_type === 'credit' && e.status === 'completed')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalRefunds = entries
        .filter((e) => e.transaction_type === 'refund')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // FINANCE-CONFIG-V1: Group by method_type from payment_methods table (not hardcoded strings)
      const totalCash = entries
        .filter((e) => 
          e.payment_methods?.method_type === 'cash' && 
          e.status === 'completed'
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalCard = entries
        .filter((e) => 
          e.payment_methods?.method_type === 'card' && 
          e.status === 'completed'
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalPOS = entries
        .filter((e) => 
          e.payment_methods?.method_type === 'pos' && 
          e.status === 'completed'
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalTransfer = entries
        .filter((e) => 
          e.payment_methods?.method_type === 'transfer' && 
          e.status === 'completed'
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Group by department
      const deptMap = new Map<string, number>();
      entries
        .filter((e) => e.status === 'completed')
        .forEach((e) => {
          const dept = e.department || 'other';
          deptMap.set(dept, (deptMap.get(dept) || 0) + (e.amount || 0));
        });
      const byDepartment = Array.from(deptMap.entries())
        .map(([department, total]) => ({ department, total }))
        .sort((a, b) => b.total - a.total);

      // Group by payment method using method_name from payment_methods table
      const methodMap = new Map<string, number>();
      entries
        .filter((e) => e.status === 'completed' && e.payment_methods?.method_name)
        .forEach((e) => {
          const method = e.payment_methods?.method_name || 'other';
          methodMap.set(method, (methodMap.get(method) || 0) + (e.amount || 0));
        });
      const byPaymentMethod = Array.from(methodMap.entries())
        .map(([method, total]) => ({ method, total }))
        .sort((a, b) => b.total - a.total);

      return {
        totalRevenue,
        totalRefunds,
        totalCash,
        totalCard,
        totalPOS,
        totalTransfer,
        byDepartment,
        byPaymentMethod,
        transactionCount: entries.length,
      };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });
}
