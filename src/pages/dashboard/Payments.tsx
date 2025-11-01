import { useState, useMemo } from 'react';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Download, Filter, Search, CreditCard, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { PaymentDrawer } from '@/modules/payments/PaymentDrawer';
import { QuickPayment } from '@/modules/payments/QuickPayment';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function Payments() {
  const { tenantId } = useAuth();
  const { payments, isLoading } = usePayments();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.transaction_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.provider_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const normalizedStatus = payment.status === 'success' || payment.status === 'completed' ? 'paid' : payment.status;
    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    const matchesProvider = providerFilter === 'all' || payment.method_provider === providerFilter;
    
    const paymentDate = new Date(payment.created_at);
    const matchesDateFrom = !dateFrom || paymentDate >= dateFrom;
    const matchesDateTo = !dateTo || paymentDate <= dateTo;
    
    return matchesSearch && matchesStatus && matchesMethod && matchesProvider && matchesDateFrom && matchesDateTo;
  });

  // Provider breakdown stats
  const providerBreakdown = useMemo(() => {
    const breakdown = filteredPayments.reduce((acc, payment) => {
      const provider = payment.method_provider || 'Unknown';
      if (!acc[provider]) {
        acc[provider] = { count: 0, total: 0 };
      }
      acc[provider].count++;
      acc[provider].total += Number(payment.amount);
      return acc;
    }, {} as Record<string, { count: number; total: number }>);
    return breakdown;
  }, [filteredPayments]);

  // Reconciliation stats
  const reconciliationStats = useMemo(() => {
    const reconciled = filteredPayments.filter(p => p.metadata?.reconciled).length;
    const unreconciled = filteredPayments.filter(p => !p.metadata?.reconciled && p.status === 'paid').length;
    return { reconciled, unreconciled };
  }, [filteredPayments]);

  const uniqueProviders = useMemo(() => {
    return Array.from(new Set(payments.map(p => p.method_provider).filter(Boolean)));
  }, [payments]);

  const togglePaymentSelection = (paymentId: string) => {
    const newSelection = new Set(selectedPayments);
    if (newSelection.has(paymentId)) {
      newSelection.delete(paymentId);
    } else {
      newSelection.add(paymentId);
    }
    setSelectedPayments(newSelection);
  };

  const selectAllFiltered = () => {
    setSelectedPayments(new Set(filteredPayments.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedPayments(new Set());
  };

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Reconciliation Status</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-status-available" />
                <span className="text-2xl font-bold">{reconciliationStats.reconciled}</span>
                <span className="text-sm text-muted-foreground">Reconciled</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-2xl font-bold">{reconciliationStats.unreconciled}</span>
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 md:col-span-2">
            <div className="text-sm text-muted-foreground mb-2">Provider Breakdown</div>
            <div className="flex flex-wrap gap-4">
              {Object.entries(providerBreakdown).map(([provider, stats]) => (
                <div key={provider} className="flex flex-col">
                  <span className="text-sm font-medium">{provider}</span>
                  <span className="text-xs text-muted-foreground">
                    {stats.count} payments · NGN {stats.total.toFixed(2)}
                  </span>
                </div>
              ))}
              {Object.keys(providerBreakdown).length === 0 && (
                <span className="text-sm text-muted-foreground">No providers</span>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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

                <Select value={providerFilter} onValueChange={setProviderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {uniqueProviders.map(provider => (
                      <SelectItem key={provider} value={provider!}>{provider}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedPayments.size > 0 && (
            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedPayments.size} payment{selectedPayments.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button variant="destructive" size="sm">
                  Bulk Refund
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllFiltered();
                      } else {
                        clearSelection();
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reconciliation</TableHead>
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPayments.has(payment.id)}
                      onCheckedChange={() => togglePaymentSelection(payment.id)}
                    />
                  </TableCell>
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
                  <TableCell>
                    {payment.metadata?.reconciled ? (
                      <div className="flex items-center gap-1 text-status-available">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Reconciled</span>
                      </div>
                    ) : payment.status === 'paid' ? (
                      <div className="flex items-center gap-1 text-warning">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Pending</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
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
