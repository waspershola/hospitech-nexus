import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, Wallet } from 'lucide-react';
import type { FinanceKPIs } from '@/hooks/useFinanceOverview';
import { Skeleton } from '@/components/ui/skeleton';

interface FinanceOverviewKPIsProps {
  data?: FinanceKPIs;
  isLoading: boolean;
}

export function FinanceOverviewKPIs({ data, isLoading }: FinanceOverviewKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      title: 'Total Inflow',
      value: `₦${data.totalInflow.toLocaleString()}`,
      subtitle: 'Today',
      icon: ArrowUpRight,
      trend: 'up',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Total Outflow',
      value: `₦${data.totalOutflow.toLocaleString()}`,
      subtitle: 'Today',
      icon: ArrowDownRight,
      trend: 'down',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Net Balance',
      value: `₦${data.netBalance.toLocaleString()}`,
      subtitle: 'Today',
      icon: TrendingUp,
      trend: data.netBalance >= 0 ? 'up' : 'down',
      iconBg: data.netBalance >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10',
      iconColor: data.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
    },
    {
      title: 'Pending Receivables',
      value: `₦${data.pendingReceivables.total.toLocaleString()}`,
      subtitle: `${data.pendingReceivables.count} open`,
      icon: AlertCircle,
      trend: 'neutral',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      title: 'Credit Wallets',
      value: `₦${data.activeCreditWallets.total.toLocaleString()}`,
      subtitle: `${data.activeCreditWallets.count} active`,
      icon: Wallet,
      trend: 'neutral',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
                <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
