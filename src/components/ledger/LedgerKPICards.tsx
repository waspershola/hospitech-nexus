import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import { useLedgerStats } from '@/hooks/useLedgerStats';
import type { LedgerFilters } from '@/types/ledger';
import { Skeleton } from '@/components/ui/skeleton';

interface LedgerKPICardsProps {
  filters: LedgerFilters;
}

export function LedgerKPICards({ filters }: LedgerKPICardsProps) {
  const { data: stats, isLoading } = useLedgerStats(filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const kpis = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Total Refunds',
      value: formatCurrency(stats.totalRefunds),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Cash',
      value: formatCurrency(stats.totalCash),
      icon: Banknote,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Card',
      value: formatCurrency(stats.totalCard),
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'POS',
      value: formatCurrency(stats.totalPOS),
      icon: Wallet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Transfer',
      value: formatCurrency(stats.totalTransfer),
      icon: ArrowLeftRight,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium mb-1">
                    {kpi.label}
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {kpi.value}
                  </p>
                </div>
                <div className={`${kpi.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
