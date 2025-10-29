import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useWalletTransactions } from '@/hooks/useWalletTransactions';
import { useWallets } from '@/hooks/useWallets';

interface WalletTransactionsDrawerProps {
  open: boolean;
  onClose: () => void;
  walletId: string | null;
}

export function WalletTransactionsDrawer({ open, onClose, walletId }: WalletTransactionsDrawerProps) {
  const { data: transactions, isLoading } = useWalletTransactions(walletId || undefined);
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.id === walletId);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Transaction History</SheetTitle>
          <SheetDescription>
            {wallet?.name || 'Wallet'} - Balance: ₦{wallet?.balance.toLocaleString() || 0}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
          )}

          {!isLoading && transactions && transactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
          )}

          {transactions?.map((txn: any) => {
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
