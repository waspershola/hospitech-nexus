import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: string;
  due_date: string;
  paid_at?: string;
  created_at: string;
  line_items?: any;
  metadata?: any;
  updated_at?: string;
}

interface BillingInvoicesTableProps {
  invoices: Invoice[];
  onMarkPaid?: (invoiceId: string) => void;
  onViewDetails?: (invoice: Invoice) => void;
}

export function BillingInvoicesTable({ 
  invoices, 
  onMarkPaid,
  onViewDetails 
}: BillingInvoicesTableProps) {
  const getStatusBadge = (invoice: Invoice) => {
    const isOverdue = invoice.status === 'pending' && new Date(invoice.due_date) < new Date();
    
    if (invoice.status === 'paid') {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Paid</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  };

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No invoices found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono text-sm">
                {invoice.invoice_number}
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(invoice.period_start), 'MMM d')} - {format(new Date(invoice.period_end), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="font-semibold">
                ₦{Number(invoice.total_amount).toLocaleString()}
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(invoice.due_date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                {getStatusBadge(invoice)}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails?.(invoice)}
                >
                  View
                </Button>
                {invoice.status === 'pending' && onMarkPaid && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onMarkPaid(invoice.id)}
                  >
                    Mark Paid
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
