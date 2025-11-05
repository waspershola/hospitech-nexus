import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSMSAnalytics } from '@/hooks/useSMSAnalytics';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, MessageSquare, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function SMSAnalyticsTab() {
  const [period, setPeriod] = useState('30');
  const { analytics, isLoading } = useSMSAnalytics(parseInt(period));

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No data available</div>;
  }

  const trendData = Object.entries(analytics.byDate).map(([date, data]) => ({
    date: format(new Date(date), 'MMM dd'),
    sent: data.sent,
    delivered: data.delivered,
    failed: data.failed,
  })).slice(-14); // Last 14 days

  const eventTypeData = Object.entries(analytics.byEventType).map(([key, data]) => ({
    name: key.replace(/_/g, ' ').toUpperCase(),
    value: data.count,
    cost: data.cost,
  }));

  const statusData = [
    { name: 'Delivered', value: analytics.delivered },
    { name: 'Failed', value: analytics.failed },
    { name: 'Pending', value: analytics.pending },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">SMS Analytics</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{analytics.totalSent}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{analytics.deliveryRate.toFixed(1)}%</p>
              </div>
              {analytics.deliveryRate >= 95 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-orange-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">₦{analytics.totalCost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{analytics.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Trends</CardTitle>
            <CardDescription>SMS delivery over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" name="Sent" />
                <Line type="monotone" dataKey="delivered" stroke="hsl(var(--green))" name="Delivered" />
                <Line type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Status</CardTitle>
            <CardDescription>Message status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage by Event Type</CardTitle>
            <CardDescription>SMS count per event type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Event Type</CardTitle>
            <CardDescription>Spending breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={eventTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="hsl(var(--secondary))" name="Cost (₦)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent SMS Activity</CardTitle>
          <CardDescription>Last 10 messages sent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.event_key.replace(/_/g, ' ')}</Badge>
                    <span className="text-sm text-muted-foreground">{log.recipient}</span>
                  </div>
                  {log.message_preview && (
                    <p className="text-sm mt-1 text-muted-foreground truncate">
                      {log.message_preview}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {log.status === 'delivered' && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Delivered
                    </Badge>
                  )}
                  {log.status === 'failed' && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  {log.status === 'sent' && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">₦{Number(log.cost).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
