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

      // Build base query
      let query = supabase
        .from('ledger_entries')
        .select('amount, transaction_type, payment_method, department, status')
        .eq('tenant_id', tenantId);

      // Apply same filters as main ledger query
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }
      if (filters.transactionType?.length) {
        query = query.in('transaction_type', filters.transactionType as any);
      }
      if (filters.paymentMethod?.length) {
        query = query.in('payment_method', filters.paymentMethod as any);
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

      // Calculate stats
      const totalRevenue = entries
        .filter((e) => e.transaction_type === 'credit' && e.status === 'completed')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalRefunds = entries
        .filter((e) => e.transaction_type === 'refund')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalCash = entries
        .filter((e) => e.payment_method === 'cash' && e.status === 'completed')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalCard = entries
        .filter((e) => e.payment_method === 'card' && e.status === 'completed')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalPOS = entries
        .filter((e) => e.payment_method === 'pos' && e.status === 'completed')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const totalTransfer = entries
        .filter((e) => e.payment_method === 'transfer' && e.status === 'completed')
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

      // Group by payment method
      const methodMap = new Map<string, number>();
      entries
        .filter((e) => e.status === 'completed' && e.payment_method)
        .forEach((e) => {
          const method = e.payment_method || 'other';
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
