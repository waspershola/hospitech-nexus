import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle, Ban, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
  amount: number;
  due_date: string;
  status: string;
  tenants?: { name: string; status: string };
}

interface PaymentEnforcementCardProps {
  overdueInvoices: OverdueInvoice[];
  onReactivate: (tenantId: string, invoiceId: string) => void;
}

export function PaymentEnforcementCard({ overdueInvoices, onReactivate }: PaymentEnforcementCardProps) {
  const getDaysPastDue = (dueDate: string) => {
    return Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getSeverityBadge = (daysPastDue: number) => {
    if (daysPastDue >= 14) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="h-3 w-3" />
          Suspended
        </Badge>
      );
    } else if (daysPastDue >= 7) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </Badge>
      );
    } else if (daysPastDue >= 3) {
      return (
        <Badge variant="default" className="bg-warning gap-1">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overdue Invoices & Enforcement</CardTitle>
        <CardDescription>
          Manage payment reminders and tenant suspensions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overdueInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success opacity-50" />
            <p>No overdue invoices - all payments are current</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueInvoices.map((invoice) => {
                const daysPastDue = getDaysPastDue(invoice.due_date);
                const isSuspended = invoice.tenants?.status === 'suspended';

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {invoice.tenants?.name || 'Unknown'}
                        {isSuspended && (
                          <Badge variant="destructive" className="text-xs">
                            Suspended
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-destructive">
                        {daysPastDue} days
                      </span>
                    </TableCell>
                    <TableCell>{getSeverityBadge(daysPastDue)}</TableCell>
                    <TableCell>
                      {isSuspended && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReactivate(invoice.tenant_id, invoice.id)}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="mt-6 p-4 border border-muted rounded-lg bg-muted/50">
          <h4 className="font-semibold mb-3">Enforcement Policy</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span><strong>Day 1:</strong> First reminder email sent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span><strong>Day 3:</strong> Second reminder email sent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span><strong>Day 7:</strong> Final warning email sent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span><strong>Day 14:</strong> Tenant suspended until payment received</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
