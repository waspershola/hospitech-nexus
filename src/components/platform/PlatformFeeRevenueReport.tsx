import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformFeeRevenue } from '@/hooks/usePlatformFeeRevenue';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, Receipt, Users, Database } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { PlatformFeeBackfillDialog } from './PlatformFeeBackfillDialog';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))'];

export function PlatformFeeRevenueReport() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [backfillDialogOpen, setBackfillDialogOpen] = useState(false);
  
  const { data: revenue, isLoading } = usePlatformFeeRevenue(startDate, endDate);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!revenue) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No revenue data available
      </div>
    );
  }

  const pieData = revenue.revenueByType.map((item, index) => ({
    name: item.type === 'booking' ? 'Booking Fees' : 'QR Payment Fees',
    value: item.revenue,
    count: item.count,
    fill: COLORS[index],
  }));

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Period Filter</CardTitle>
              <CardDescription>Select date range to filter revenue data</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setBackfillDialogOpen(true)}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              Backfill Fees
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(startDate || endDate) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{revenue.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {revenue.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Fees</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{revenue.bookingRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((revenue.bookingRevenue / revenue.totalRevenue) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Payment Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{revenue.qrRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((revenue.qrRevenue / revenue.totalRevenue) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenue.revenueByTenant.length}</div>
            <p className="text-xs text-muted-foreground">
              Generating platform fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Type - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Fee Type</CardTitle>
          <CardDescription>Distribution of platform fees by transaction type</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, value }) => `${name}: ₦${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `₦${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>Monthly platform fee revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenue.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `₦${value}`}
              />
              <Tooltip
                formatter={(value: number) => `₦${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="booking_revenue"
                name="Booking Revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line
                type="monotone"
                dataKey="qr_revenue"
                name="QR Revenue"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--secondary))' }}
              />
              <Line
                type="monotone"
                dataKey="total_revenue"
                name="Total Revenue"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--accent))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Tenant Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Tenant</CardTitle>
          <CardDescription>Detailed breakdown of platform fees per tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant Name</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Booking Fees</TableHead>
                <TableHead className="text-right">QR Fees</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Avg per Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenue.revenueByTenant.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No tenant revenue data available
                  </TableCell>
                </TableRow>
              ) : (
                revenue.revenueByTenant.map((tenant) => (
                  <TableRow key={tenant.tenant_id}>
                    <TableCell className="font-medium">{tenant.tenant_name}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₦{tenant.total_revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{tenant.booking_revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{tenant.qr_revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{tenant.transaction_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ₦{(tenant.total_revenue / tenant.transaction_count).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlatformFeeBackfillDialog
        open={backfillDialogOpen}
        onOpenChange={setBackfillDialogOpen}
      />
    </div>
  );
}
