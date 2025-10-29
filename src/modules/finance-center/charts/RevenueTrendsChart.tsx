import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface RevenueTrendsChartProps {
  data: Array<{
    date: string;
    amount: number;
    payment_count: number;
  }>;
  granularity: 'daily' | 'weekly' | 'monthly';
}

export function RevenueTrendsChart({ data, granularity }: RevenueTrendsChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: granularity === 'daily' ? 'numeric' : undefined,
        year: granularity === 'monthly' ? 'numeric' : undefined,
      }),
      revenue: item.amount,
      count: item.payment_count,
    }));
  }, [data, granularity]);

  const totalRevenue = data.reduce((sum, item) => sum + item.amount, 0);
  const avgRevenue = totalRevenue / (data.length || 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Revenue Trends
        </CardTitle>
        <CardDescription>
          {granularity.charAt(0).toUpperCase() + granularity.slice(1)} revenue overview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-primary">₦{totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average per {granularity === 'daily' ? 'Day' : granularity === 'weekly' ? 'Week' : 'Month'}</p>
            <p className="text-2xl font-bold">₦{avgRevenue.toLocaleString()}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              fill="url(#revenueGradient)"
              strokeWidth={2}
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
