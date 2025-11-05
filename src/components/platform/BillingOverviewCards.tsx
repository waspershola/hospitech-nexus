import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Clock, AlertTriangle } from 'lucide-react';

interface BillingSummary {
  total: number;
  pending: number;
  paid: number;
  overdue: number;
  totalAmount: number;
  pendingAmount: number;
}

interface BillingOverviewCardsProps {
  summary: BillingSummary;
}

export function BillingOverviewCards({ summary }: BillingOverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₦{summary.totalAmount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            From {summary.total} invoices
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₦{summary.pendingAmount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {summary.pending} pending invoices
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.paid}</div>
          <p className="text-xs text-muted-foreground">
            Invoices paid
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{summary.overdue}</div>
          <p className="text-xs text-muted-foreground">
            Require attention
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
