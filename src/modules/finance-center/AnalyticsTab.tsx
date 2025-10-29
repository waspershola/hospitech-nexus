import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatCardSkeleton } from '@/components/ui/skeleton-loaders';
import { cn } from '@/lib/utils';

export function AnalyticsTab() {
  const { tenantId } = useAuth();
  const [dateRange, setDateRange] = useState({ 
    start: startOfDay(subDays(new Date(), 30)), 
    end: endOfDay(new Date()) 
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

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

      <Card className="p-6 rounded-2xl shadow-card">
        <h3 className="text-lg font-display font-semibold mb-4">Payment Methods Breakdown</h3>
        {paymentsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="flex items-center gap-4">
                  <div className="w-48 h-2 bg-muted rounded-full animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : payments && payments.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(
              payments.reduce((acc, p) => {
                const method = p.method || 'Unknown';
                acc[method] = (acc[method] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([method, count]) => (
              <div key={method} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{method}</span>
                <div className="flex items-center gap-4">
                  <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
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
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No payment data available for this period</p>
          </div>
        )}
      </Card>
    </div>
  );
}
