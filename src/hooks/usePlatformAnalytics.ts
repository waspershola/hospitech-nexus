import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format } from 'date-fns';

export function usePlatformAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const lastMonthStart = subMonths(currentMonthStart, 1);
      const sixMonthsAgo = subMonths(now, 6);

      // Fetch all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, status, created_at, metadata');
      
      if (tenantsError) throw tenantsError;

      // Fetch all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          subscription_plans(name, price, billing_cycle)
        `);
      
      if (subsError) throw subsError;

      // Fetch invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('platform_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (invoicesError) throw invoicesError;

      // Fetch recent 6 months of invoices for trends
      const { data: recentInvoices, error: recentError } = await supabase
        .from('platform_invoices')
        .select('amount, status, created_at, paid_at')
        .gte('created_at', sixMonthsAgo.toISOString());
      
      if (recentError) throw recentError;

      // Calculate tenant metrics
      const tenantMetrics = {
        total: tenants?.length || 0,
        active: tenants?.filter(t => t.status === 'active').length || 0,
        trial: tenants?.filter(t => t.status === 'trial').length || 0,
        suspended: tenants?.filter(t => t.status === 'suspended').length || 0,
        new_this_month: tenants?.filter(t => 
          new Date(t.created_at) >= currentMonthStart
        ).length || 0,
      };

      // Calculate MRR (Monthly Recurring Revenue)
      const activeSubscriptions = subscriptions?.filter((sub: any) => 
        sub.status === 'active' || sub.status === 'trialing'
      ) || [];
      
      const mrr = activeSubscriptions.reduce((sum: number, sub: any) => {
        const plan = sub.subscription_plans as any;
        if (!plan) return sum;
        
        const price = Number(plan.price) || 0;
        const multiplier = plan.billing_cycle === 'yearly' ? (1 / 12) : 1;
        return sum + (price * multiplier);
      }, 0);

      // Calculate revenue metrics
      const paidInvoices = invoices?.filter((inv: any) => inv.status === 'paid') || [];
      const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => 
        sum + Number(inv.amount || 0), 0
      );
      
      const currentMonthRevenue = paidInvoices
        .filter((inv: any) => new Date(inv.paid_at || inv.created_at) >= currentMonthStart)
        .reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);
      
      const lastMonthRevenue = paidInvoices
        .filter((inv: any) => {
          const date = new Date(inv.paid_at || inv.created_at);
          return date >= lastMonthStart && date < currentMonthStart;
        })
        .reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // Calculate invoice metrics
      const invoiceMetrics = {
        total: invoices?.length || 0,
        paid: paidInvoices.length,
        pending: invoices?.filter((inv: any) => inv.status === 'pending').length || 0,
        overdue: invoices?.filter((inv: any) => inv.status === 'overdue').length || 0,
        outstanding: invoices
          ?.filter((inv: any) => inv.status === 'pending' || inv.status === 'overdue')
          .reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0) || 0,
      };

      // Calculate monthly revenue trends
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = subMonths(currentMonthStart, i);
        const monthEnd = subMonths(currentMonthStart, i - 1);
        
        const monthRevenue = recentInvoices
          ?.filter((inv: any) => {
            const date = new Date(inv.paid_at || inv.created_at);
            return inv.status === 'paid' && date >= monthStart && date < monthEnd;
          })
          .reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0) || 0;
        
        monthlyTrends.push({
          month: format(monthStart, 'MMM yyyy'),
          revenue: monthRevenue,
        });
      }

      return {
        tenantMetrics,
        revenueMetrics: {
          mrr,
          totalRevenue,
          currentMonthRevenue,
          lastMonthRevenue,
          revenueGrowth,
        },
        invoiceMetrics,
        monthlyTrends,
      };
    },
  });

  return {
    analytics,
    isLoading,
  };
}
