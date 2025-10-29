import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';

export function AnalyticsTab() {
  const { tenantId } = useAuth();
  const [dateRange] = useState({ start: subDays(new Date(), 30), end: new Date() });

  const { data: payments } = useQuery({
    queryKey: ['payments-analytics', tenantId, dateRange],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: wallets } = useQuery({
    queryKey: ['wallets-analytics', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const successfulPayments = payments?.filter(p => p.status === 'paid').length || 0;
  const failedPayments = payments?.filter(p => p.status === 'failed').length || 0;
  const totalWalletBalance = wallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;

  const stats = [
    {
      title: 'Total Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      title: 'Successful Payments',
      value: successfulPayments,
      change: `${payments?.length || 0} total`,
      icon: TrendingUp,
      trend: 'up' as const,
    },
    {
      title: 'Failed Payments',
      value: failedPayments,
      change: `${((failedPayments / (payments?.length || 1)) * 100).toFixed(1)}% rate`,
      icon: AlertCircle,
      trend: 'down' as const,
    },
    {
      title: 'Total Wallet Balance',
      value: `₦${totalWalletBalance.toLocaleString()}`,
      change: `${wallets?.length || 0} wallets`,
      icon: TrendingUp,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <p className="text-muted-foreground">
          Last 30 days ({format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')})
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <stat.icon className={`w-4 h-4 ${
                stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
              }`} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className={`text-xs ${
                stat.trend === 'up' ? 'text-green-500' : 'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payment Methods Breakdown</h3>
        <div className="space-y-4">
          {payments && Object.entries(
            payments.reduce((acc, p) => {
              const method = p.method || 'Unknown';
              acc[method] = (acc[method] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([method, count]) => (
            <div key={method} className="flex items-center justify-between">
              <span className="text-sm font-medium">{method}</span>
              <div className="flex items-center gap-4">
                <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(count / payments.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-16 text-right">
                  {count} ({((count / payments.length) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
