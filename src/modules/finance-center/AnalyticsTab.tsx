import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatCardSkeleton } from '@/components/ui/skeleton-loaders';
import { cn } from '@/lib/utils';
import { useFinanceAnalytics } from '@/hooks/useFinanceAnalytics';
import { RevenueTrendsChart } from './charts/RevenueTrendsChart';
import { PaymentMethodStats } from './charts/PaymentMethodStats';
import { DepartmentOverview } from './charts/DepartmentOverview';
import { DiscrepancyHeatmap } from './charts/DiscrepancyHeatmap';
import { WalletFlowGraph } from './charts/WalletFlowGraph';

export function AnalyticsTab() {
  const { tenantId } = useAuth();
  const [dateRange, setDateRange] = useState({ 
    start: startOfDay(subDays(new Date(), 30)), 
    end: endOfDay(new Date()) 
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const analytics = useFinanceAnalytics({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const setQuickRange = (days: number) => {
    setDateRange({
      start: startOfDay(subDays(new Date(), days)),
      end: endOfDay(new Date()),
    });
  };

  const { data: payments, isLoading: paymentsLoading } = useQuery({
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold">Analytics</h2>
          <p className="text-muted-foreground">
            {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              variant={dateRange.start >= startOfDay(subDays(new Date(), 7)) ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickRange(7)}
            >
              7 Days
            </Button>
            <Button
              variant={dateRange.start >= startOfDay(subDays(new Date(), 30)) && dateRange.start < startOfDay(subDays(new Date(), 7)) ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickRange(30)}
            >
              30 Days
            </Button>
            <Button
              variant={dateRange.start >= startOfDay(subDays(new Date(), 90)) && dateRange.start < startOfDay(subDays(new Date(), 30)) ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickRange(90)}
            >
              90 Days
            </Button>
          </div>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-4 h-4" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: startOfDay(date) }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: endOfDay(date) }))}
                  />
                </div>
                <Button className="w-full" onClick={() => setCalendarOpen(false)}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {paymentsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          stats.map((stat) => (
            <Card key={stat.title} className="p-6 rounded-2xl shadow-card hover:shadow-luxury transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <stat.icon className={cn(
                  "w-4 h-4",
                  stat.trend === 'up' ? 'text-semantic-success' : 'text-semantic-warning'
                )} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className={cn(
                  "text-xs",
                  stat.trend === 'up' ? 'text-semantic-success' : 'text-muted-foreground'
                )}>
                  {stat.change}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Charts */}
      <div className="space-y-6">
        <RevenueTrendsChart data={analytics.revenueTrends} granularity={granularity} />
        
        <div className="grid lg:grid-cols-2 gap-6">
          <PaymentMethodStats data={analytics.paymentMethods} />
          <WalletFlowGraph data={analytics.walletFlow} />
        </div>

        <DepartmentOverview data={analytics.departments} />
        
        <DiscrepancyHeatmap data={analytics.discrepancies} />
      </div>
    </div>
  );
}
