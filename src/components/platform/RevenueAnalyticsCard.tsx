import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface RevenueAnalyticsCardProps {
  mrr: number;
  totalRevenue: number;
  currentMonthRevenue: number;
  revenueGrowth: number;
}

export function RevenueAnalyticsCard({ 
  mrr, 
  totalRevenue, 
  currentMonthRevenue, 
  revenueGrowth 
}: RevenueAnalyticsCardProps) {
  const isPositiveGrowth = revenueGrowth >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${mrr.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Active subscriptions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${currentMonthRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Current period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
          {isPositiveGrowth ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPositiveGrowth ? 'text-green-500' : 'text-red-500'}`}>
            {isPositiveGrowth ? '+' : ''}{revenueGrowth.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">vs last month</p>
        </CardContent>
      </Card>
    </div>
  );
}
