import { usePlatformAnalytics } from '@/hooks/usePlatformAnalytics';
import { RevenueAnalyticsCard } from '@/components/platform/RevenueAnalyticsCard';
import { TenantAnalyticsCard } from '@/components/platform/TenantAnalyticsCard';
import { InvoiceAnalyticsCard } from '@/components/platform/InvoiceAnalyticsCard';
import { RevenueChart } from '@/components/platform/RevenueChart';
import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlatformAnalytics() {
  const { analytics, isLoading } = usePlatformAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-foreground">Platform Analytics</h1>
            <p className="text-muted-foreground">Comprehensive platform metrics and insights</p>
          </div>
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-foreground">Platform Analytics</h1>
            <p className="text-muted-foreground">Comprehensive platform metrics and insights</p>
          </div>
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center py-12 text-muted-foreground">
          No analytics data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground">Comprehensive platform metrics and insights</p>
        </div>
        <BarChart3 className="h-8 w-8 text-primary" />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Revenue Metrics</h2>
          <RevenueAnalyticsCard 
            mrr={analytics.revenueMetrics.mrr}
            totalRevenue={analytics.revenueMetrics.totalRevenue}
            currentMonthRevenue={analytics.revenueMetrics.currentMonthRevenue}
            revenueGrowth={analytics.revenueMetrics.revenueGrowth}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Tenant Overview</h2>
          <TenantAnalyticsCard 
            total={analytics.tenantMetrics.total}
            active={analytics.tenantMetrics.active}
            trial={analytics.tenantMetrics.trial}
            suspended={analytics.tenantMetrics.suspended}
            newThisMonth={analytics.tenantMetrics.new_this_month}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Invoice Status</h2>
          <InvoiceAnalyticsCard 
            total={analytics.invoiceMetrics.total}
            paid={analytics.invoiceMetrics.paid}
            pending={analytics.invoiceMetrics.pending}
            overdue={analytics.invoiceMetrics.overdue}
            outstanding={analytics.invoiceMetrics.outstanding}
          />
        </div>

        <RevenueChart data={analytics.monthlyTrends} />
      </div>
    </div>
  );
}
