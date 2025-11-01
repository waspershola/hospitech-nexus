import { useState } from 'react';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Filter, Search, CreditCard } from 'lucide-react';
import { PaymentDrawer } from '@/modules/payments/PaymentDrawer';
import { QuickPayment } from '@/modules/payments/QuickPayment';

export default function Payments() {
  const { tenantId } = useAuth();
  const { payments, isLoading } = usePayments();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.transaction_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.provider_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Handle both 'paid', 'success', and 'completed' as the same status
    const normalizedStatus = payment.status === 'success' || payment.status === 'completed' ? 'paid' : payment.status;
    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
    
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusColor = (status: string) => {
    // Normalize status for display
    const normalizedStatus = status === 'success' || status === 'completed' ? 'paid' : status;
    
    switch (normalizedStatus) {
      case 'paid':
        return 'bg-status-available/10 text-status-available border-status-available/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'refunded':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Reference', 'Amount', 'Method', 'Status', 'Provider'];
    const rows = filteredPayments.map(p => [
      new Date(p.created_at).toLocaleDateString(),
      p.transaction_ref || '',
      p.amount,
      p.method || '',
      p.status,
      p.method_provider || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading payments...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display text-foreground mb-2">Payments</h1>
            <p className="text-muted-foreground">View and manage all payment transactions</p>
          </div>
          <Button onClick={() => setIsQuickPaymentOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow 
                  key={payment.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedPayment(payment.id)}
                >
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.transaction_ref || 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.currency} {Number(payment.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="capitalize">{payment.method || 'N/A'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.method_provider || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(payment.status)}>
                      {payment.status === 'success' || payment.status === 'completed' ? 'paid' : payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPayment(payment.id);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredPayments.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || methodFilter !== 'all'
                ? 'No payments match your filters.'
                : 'No payments recorded yet. Record your first payment to get started.'}
            </div>
          )}
        </Card>
      </div>

      <PaymentDrawer
        paymentId={selectedPayment}
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      <QuickPayment
        open={isQuickPaymentOpen}
        onClose={() => setIsQuickPaymentOpen(false)}
      />
    </>
  );
}
