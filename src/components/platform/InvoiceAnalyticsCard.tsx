import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface InvoiceAnalyticsCardProps {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  outstanding: number;
}

export function InvoiceAnalyticsCard({ 
  total, 
  paid, 
  pending, 
  overdue, 
  outstanding 
}: InvoiceAnalyticsCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Paid</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{paid}</div>
          <p className="text-xs text-muted-foreground mt-1">Successfully collected</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-500">{pending}</div>
          <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{overdue}</div>
          <p className="text-xs text-muted-foreground mt-1">Past due date</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          <FileText className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">${outstanding.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">Unpaid amount</p>
        </CardContent>
      </Card>
    </div>
  );
}
