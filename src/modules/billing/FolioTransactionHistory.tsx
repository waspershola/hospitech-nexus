import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';
import { Filter, ArrowLeftRight, Split, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface FolioTransactionHistoryProps {
  folioId: string;
  onTransfer?: (transactionId: string, amount: number) => void;
  onSplit?: (transactionId: string, amount: number, description: string) => void;
  onReverse?: (transactionId: string) => void;
  availableFoliosCount?: number;
}

type TransactionFilter = 'all' | 'charge' | 'payment';

export function FolioTransactionHistory({ 
  folioId, 
  onTransfer, 
  onSplit, 
  onReverse,
  availableFoliosCount = 1 
}: FolioTransactionHistoryProps) {
  const { tenantId } = useAuth();
  const [filter, setFilter] = useState<TransactionFilter>('all');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['folio-transactions', folioId, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('folio_id', folioId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!folioId && !!tenantId,
  });

  const filteredTransactions = transactions?.filter(txn => {
    if (filter === 'all') return true;
    return txn.transaction_type === filter;
  });

  // Calculate running balance
  const transactionsWithBalance = filteredTransactions?.map((txn, idx, arr) => {
    const previousBalance = idx === arr.length - 1 
      ? 0 
      : arr.slice(idx + 1).reduce((sum, t) => {
          return sum + (t.transaction_type === 'charge' ? t.amount : -t.amount);
        }, 0);
    
    const balance = previousBalance + (txn.transaction_type === 'charge' ? txn.amount : -txn.amount);
    
    return { ...txn, balance };
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'charge' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('charge')}
            >
              Charges
            </Button>
            <Button
              variant={filter === 'payment' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('payment')}
            >
              Payments
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!transactionsWithBalance || transactionsWithBalance.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                {(onTransfer || onSplit || onReverse) && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsWithBalance.map((txn) => (
                <TableRow 
                  key={txn.id}
                  className={txn.transaction_type === 'rebate' ? 'bg-orange-50' : ''}
                >
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {txn.transaction_type === 'charge' && (
                      <Badge variant="destructive">Charge</Badge>
                    )}
                    {txn.transaction_type === 'payment' && (
                      <Badge variant="default" className="bg-green-600">Payment</Badge>
                    )}
                    {txn.transaction_type === 'rebate' && (
                      <Badge variant="default" className="bg-orange-600">Rebate</Badge>
                    )}
                    {txn.transaction_type !== 'charge' && txn.transaction_type !== 'payment' && txn.transaction_type !== 'rebate' && (
                      <Badge variant="outline">{txn.transaction_type}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    txn.transaction_type === 'charge' ? 'text-destructive' : 'text-green-600'
                  }`}>
                    {txn.transaction_type === 'charge' ? '+' : '-'}
                    {formatCurrency(txn.amount, 'NGN')}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(txn.balance, 'NGN')}
                  </TableCell>
                  {(onTransfer || onSplit || onReverse) && (
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {txn.transaction_type === 'charge' && availableFoliosCount > 1 && onTransfer && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onTransfer(txn.id, txn.amount)}
                            title="Transfer to another folio"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </Button>
                        )}
                        {txn.transaction_type === 'charge' && availableFoliosCount > 1 && onSplit && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onSplit(txn.id, txn.amount, txn.description)}
                            title="Split across folios"
                          >
                            <Split className="w-4 h-4" />
                          </Button>
                        )}
                        {onReverse && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onReverse(txn.id)}
                            title="Reverse transaction"
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
