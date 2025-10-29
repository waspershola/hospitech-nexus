import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  department?: string;
}

export function useFinanceAnalytics(filters: AnalyticsFilters) {
  const { tenantId } = useAuth();

  // Revenue Trends
  const revenueTrends = useQuery({
    queryKey: ['finance-analytics-revenue', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('created_at, amount, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = data.reduce((acc: Record<string, { amount: number; count: number }>, payment) => {
        const date = new Date(payment.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { amount: 0, count: 0 };
        }
        acc[date].amount += Number(payment.amount);
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([date, stats]) => ({
        date,
        amount: stats.amount,
        payment_count: stats.count,
      }));
    },
    enabled: !!tenantId,
  });

  // Payment Method Stats
  const paymentMethods = useQuery({
    queryKey: ['finance-analytics-methods', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('method, amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString());

      if (error) throw error;

      // Group by method
      const grouped = data.reduce((acc: Record<string, { count: number; total: number }>, payment) => {
        const method = payment.method || 'unknown';
        if (!acc[method]) {
          acc[method] = { count: 0, total: 0 };
        }
        acc[method].count += 1;
        acc[method].total += Number(payment.amount);
        return acc;
      }, {});

      return Object.entries(grouped).map(([method, stats]) => ({
        method,
        count: stats.count,
        total_amount: stats.total,
      }));
    },
    enabled: !!tenantId,
  });

  // Department Overview
  const departments = useQuery({
    queryKey: ['finance-analytics-departments', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('payments')
        .select('department, amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString());

      if (error) throw error;

      // Group by department
      const grouped = data.reduce((acc: Record<string, { count: number; total: number }>, payment) => {
        const dept = payment.department || 'general';
        if (!acc[dept]) {
          acc[dept] = { count: 0, total: 0 };
        }
        acc[dept].count += 1;
        acc[dept].total += Number(payment.amount);
        return acc;
      }, {});

      return Object.entries(grouped).map(([department, stats]) => ({
        department,
        transaction_count: stats.count,
        total_income: stats.total,
      }));
    },
    enabled: !!tenantId,
  });

  // Discrepancy Heatmap
  const discrepancies = useQuery({
    queryKey: ['finance-analytics-discrepancies', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('finance_reconciliation_records')
        .select('created_at, amount, status')
        .eq('tenant_id', tenantId)
        .in('status', ['unmatched', 'partial'])
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString());

      if (error) throw error;

      // Group by date
      const grouped = data.reduce((acc: Record<string, { discrepancy: number; count: number }>, rec) => {
        const date = new Date(rec.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { discrepancy: 0, count: 0 };
        }
        acc[date].discrepancy += Number(rec.amount);
        acc[date].count += 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([date, stats]) => ({
        date,
        department: 'general',
        discrepancy: stats.discrepancy,
        unmatched_count: stats.count,
      }));
    },
    enabled: !!tenantId,
  });

  // Wallet Flow
  const walletFlow = useQuery({
    queryKey: ['finance-analytics-wallets', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id, name, wallet_type, balance')
        .eq('tenant_id', tenantId);

      if (walletsError) throw walletsError;

      const { data: transactions, error: txnError } = await supabase
        .from('wallet_transactions')
        .select('wallet_id, type, amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString());

      if (txnError) throw txnError;

      // Aggregate transactions per wallet
      const txnsByWallet = transactions.reduce((acc: Record<string, { credits: number; debits: number; count: number }>, txn) => {
        if (!acc[txn.wallet_id]) {
          acc[txn.wallet_id] = { credits: 0, debits: 0, count: 0 };
        }
        if (txn.type === 'credit') {
          acc[txn.wallet_id].credits += Number(txn.amount);
        } else {
          acc[txn.wallet_id].debits += Number(txn.amount);
        }
        acc[txn.wallet_id].count += 1;
        return acc;
      }, {});

      return wallets.map(wallet => ({
        wallet_id: wallet.id,
        wallet_name: wallet.name || '',
        wallet_type: wallet.wallet_type,
        balance: Number(wallet.balance),
        credit_total: txnsByWallet[wallet.id]?.credits || 0,
        debit_total: txnsByWallet[wallet.id]?.debits || 0,
        transaction_count: txnsByWallet[wallet.id]?.count || 0,
      }));
    },
    enabled: !!tenantId,
  });

  return {
    revenueTrends: revenueTrends.data || [],
    paymentMethods: paymentMethods.data || [],
    departments: departments.data || [],
    discrepancies: discrepancies.data || [],
    walletFlow: walletFlow.data || [],
    isLoading: revenueTrends.isLoading || paymentMethods.isLoading || departments.isLoading || discrepancies.isLoading || walletFlow.isLoading,
  };
}
