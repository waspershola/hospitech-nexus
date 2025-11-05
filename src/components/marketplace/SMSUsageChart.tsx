import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSMSUsageTracking } from '@/hooks/useSMSUsageTracking';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Calendar } from 'lucide-react';

export function SMSUsageChart() {
  const { usageHistory, totalSentLast30Days, isLoading } = useSMSUsageTracking();

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  // Get last 30 days of data
  const chartData = usageHistory.slice(0, 30).reverse().map(record => ({
    date: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    SMS: record.count,
    Credits: record.cost,
  }));

  // Calculate average daily usage
  const avgDailyUsage = totalSentLast30Days > 0 ? Math.round(totalSentLast30Days / 30) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              SMS Usage Analytics
            </CardTitle>
            <CardDescription>Last 30 days activity</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Daily Average: <strong>{avgDailyUsage}</strong> SMS</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
            <p>No SMS usage data available</p>
            <p className="text-sm">Start sending SMS to see analytics</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Bar 
                dataKey="SMS" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalSentLast30Days.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Sent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{avgDailyUsage.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Daily Average</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {usageHistory.length > 0 ? Math.max(...usageHistory.map(r => r.count)).toLocaleString() : 0}
            </p>
            <p className="text-sm text-muted-foreground">Peak Day</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
