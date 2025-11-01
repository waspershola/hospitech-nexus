import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Printer, Download, Filter } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWalletTransactions } from '@/hooks/useWalletTransactions';
import { useWallets } from '@/hooks/useWallets';
import { useWalletStatementPrint } from '@/hooks/useWalletStatementPrint';

interface WalletTransactionsDrawerProps {
  open: boolean;
  onClose: () => void;
  walletId: string | null;
}

export function WalletTransactionsDrawer({ open, onClose, walletId }: WalletTransactionsDrawerProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { data: transactions, isLoading } = useWalletTransactions(walletId || undefined);
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.id === walletId);
  const { printStatement, exportToCSV } = useWalletStatementPrint();

  const filteredTransactions = transactions?.filter(txn => {
    if (typeFilter === 'all') return true;
    return txn.type === typeFilter;
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Transaction History</SheetTitle>
          <SheetDescription>
            {wallet?.name || 'Wallet'} - Balance: ₦{wallet?.balance.toLocaleString() || 0}
          </SheetDescription>
        </SheetHeader>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => walletId && printStatement({ walletId })}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Statement
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => walletId && exportToCSV({ walletId })}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="credit">Credits</SelectItem>
              <SelectItem value="debit">Debits</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 space-y-4">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
          )}

          {!isLoading && filteredTransactions && filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {typeFilter === 'all' ? 'No transactions yet' : `No ${typeFilter} transactions found`}
            </div>
          )}

          {filteredTransactions?.map((txn: any) => {
            const roomNumber = txn.payment?.booking?.room?.number;
            const guestName = txn.payment?.booking?.guest?.name;
            const createdByName = txn.created_by_name;
            
            let displayDescription = txn.description || 'Transaction';
            if (roomNumber && guestName) {
              displayDescription = `Booking charge - Room ${roomNumber} - ${guestName}`;
            }

            return (
              <div
                key={txn.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card"
              >
                <div className={`p-2 rounded-full ${
                  txn.type === 'credit' 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  {txn.type === 'credit' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={txn.type === 'credit' ? 'default' : 'secondary'}>
                      {txn.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(txn.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  {displayDescription && (
                    <p className="text-sm text-muted-foreground truncate">{displayDescription}</p>
                  )}
                  {createdByName && (
                    <p className="text-xs text-muted-foreground mt-1">By: {createdByName}</p>
                  )}
                </div>

                <div className={`font-semibold ${
                  txn.type === 'credit' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {txn.type === 'credit' ? '+' : '-'}₦{txn.amount.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
