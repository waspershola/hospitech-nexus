import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Wallet, TrendingUp, TrendingDown, Plus, Minus, ArrowLeftRight, Edit } from 'lucide-react';
import { WalletOperationDialog } from './WalletOperationDialog';
import { useWalletTransactions } from '@/hooks/useWalletTransactions';

interface WalletDetailProps {
  walletId: string | null;
  open: boolean;
  onClose: () => void;
}

export function WalletDetail({ walletId, open, onClose }: WalletDetailProps) {
  const { tenantId } = useAuth();
  const [operationDialog, setOperationDialog] = useState<{
    open: boolean;
    type: 'topup' | 'withdraw' | 'transfer' | 'adjust' | null;
  }>({ open: false, type: null });

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet-detail', walletId],
    queryFn: async () => {
      if (!walletId || !tenantId) return null;
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!walletId && !!tenantId,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useWalletTransactions(walletId);

  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const openOperation = (type: 'topup' | 'withdraw' | 'transfer' | 'adjust') => {
    setOperationDialog({ open: true, type });
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case 'guest': return 'bg-chart-1/10 text-chart-1 border-chart-1/20';
      case 'department': return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
      case 'organization': return 'bg-chart-3/10 text-chart-3 border-chart-3/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : wallet ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-display flex items-center gap-2">
                  <Wallet className="w-6 h-6 text-primary" />
                  {wallet.name || `${wallet.wallet_type} Wallet`}
                </SheetTitle>
                <Badge variant="outline" className={getWalletTypeColor(wallet.wallet_type)}>
                  {wallet.wallet_type}
                </Badge>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Balance Card */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className={`text-4xl font-bold ${Number(wallet.balance) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {wallet.currency} {Number(wallet.balance).toLocaleString()}
                      </p>
                    </div>
                    <Wallet className="w-12 h-12 text-primary opacity-20" />
                  </div>

                  {wallet.department && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium capitalize">{wallet.department}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-success" />
                        Total Credits
                      </p>
                      <p className="text-lg font-semibold text-success">
                        {wallet.currency} {totalCredits.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-destructive" />
                        Total Debits
                      </p>
                      <p className="text-lg font-semibold text-destructive">
                        {wallet.currency} {totalDebits.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>

                <Separator />

                {/* Operations */}
                <div>
                  <h3 className="font-semibold mb-3">Wallet Operations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openOperation('topup')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Top Up
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openOperation('withdraw')}
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openOperation('transfer')}
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Transfer
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openOperation('adjust')}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Adjust
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Transaction History */}
                <div>
                  <h3 className="font-semibold mb-3">Transaction History</h3>
                  {transactionsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((txn) => (
                            <TableRow key={txn.id}>
                              <TableCell className="text-sm">
                                {new Date(txn.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant={txn.type === 'credit' ? 'default' : 'secondary'}>
                                  {txn.type === 'credit' ? (
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3 mr-1" />
                                  )}
                                  {txn.type}
                                </Badge>
                              </TableCell>
                              <TableCell className={`font-medium ${txn.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                                {txn.type === 'credit' ? '+' : '-'}
                                {wallet.currency} {Number(txn.amount).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {txn.description || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Wallet not found</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {wallet && operationDialog.type && (
        <WalletOperationDialog
          open={operationDialog.open}
          onClose={() => setOperationDialog({ open: false, type: null })}
          wallet={wallet}
          operationType={operationDialog.type}
        />
      )}
    </>
  );
}
