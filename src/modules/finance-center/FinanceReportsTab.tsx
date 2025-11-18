import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileText, Table as TableIcon, Calendar as CalendarIcon, TrendingUp, DollarSign } from 'lucide-react';
import { useFinanceReports } from '@/hooks/useFinanceReports';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/finance/tax';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function FinanceReportsTab() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  
  const { 
    dailyRevenue, 
    departmentRevenue, 
    outstandingSummary,
    exportPDF, 
    exportCSV, 
    isExporting 
  } = useFinanceReports(dateRange);

  const totalRevenue = dailyRevenue?.reduce((sum, row) => sum + Number(row.total_revenue), 0) || 0;
  const totalPayments = dailyRevenue?.reduce((sum, row) => sum + Number(row.payment_count), 0) || 0;

  // Aggregate department revenue
  const deptAggregated = departmentRevenue?.reduce((acc, row) => {
    const existing = acc.find(d => d.department === row.department);
    if (existing) {
      existing.revenue += Number(row.revenue);
      existing.transaction_count += row.transaction_count;
    } else {
      acc.push({
        department: row.department,
        revenue: Number(row.revenue),
        transaction_count: row.transaction_count
      });
    }
    return acc;
  }, [] as any[]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">Comprehensive revenue and payment analytics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF} disabled={isExporting} size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportCSV} variant="outline" disabled={isExporting} size="sm">
            <TableIcon className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.start, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.start} onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.end, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateRange.end} onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue, 'NGN')}</div>
            <p className="text-xs text-muted-foreground">{totalPayments} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {outstandingSummary ? formatCurrency(outstandingSummary.total_outstanding, 'NGN') : '₦0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstandingSummary?.folio_count || 0} open folios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPayments > 0 ? totalRevenue / totalPayments : 0, 'NGN')}
            </div>
            <p className="text-xs text-muted-foreground">Per payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="report_date" tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                <YAxis tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val: any) => formatCurrency(val, 'NGN')} />
                <Legend />
                <Line type="monotone" dataKey="total_revenue" stroke="hsl(var(--primary))" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deptAggregated}
                  dataKey="revenue"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.department}: ${formatCurrency(entry.revenue, 'NGN')}`}
                >
                  {deptAggregated?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatCurrency(val, 'NGN')} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Count Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="report_date" tickFormatter={(val) => format(new Date(val), 'MMM d')} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="payment_count" fill="hsl(var(--primary))" name="Payments" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
