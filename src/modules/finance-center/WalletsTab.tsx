import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, TrendingDown, History, Plus } from 'lucide-react';
import { useWallets } from '@/hooks/useWallets';
import { WalletTransactionsDrawer } from './WalletTransactionsDrawer';
import { WalletOperationDialog } from './WalletOperationDialog';
import { WalletSkeleton } from '@/components/ui/skeleton-loaders';

export function WalletsTab() {
  const { wallets, isLoading } = useWallets();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [selectedWalletName, setSelectedWalletName] = useState<string>('');
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold">Wallets</h2>
        <p className="text-muted-foreground">View and manage department, guest, and organization wallets</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <WalletSkeleton />
          <WalletSkeleton />
          <WalletSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => (
          <Card key={wallet.id} className="rounded-2xl shadow-card hover:shadow-luxury transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    {wallet.name || wallet.department || 'Unnamed Wallet'}
                  </CardTitle>
                  <CardDescription className="capitalize">{wallet.wallet_type}</CardDescription>
                </div>
                <Badge variant={wallet.balance > 0 ? 'default' : 'secondary'}>
                  {wallet.balance > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {wallet.currency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-display font-bold">
                  {wallet.currency} {wallet.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
                {wallet.last_transaction_at && (
                  <div className="text-xs text-muted-foreground">
                    Last transaction: {new Date(wallet.last_transaction_at).toLocaleDateString()}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWalletId(wallet.id);
                      setSelectedWalletName(wallet.name || wallet.department || 'Wallet');
                      setOperationOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Operation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWalletId(wallet.id);
                      setTransactionsOpen(true);
                    }}
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

          {wallets.length === 0 && (
            <Card className="col-span-full rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No wallets yet</h3>
                <p className="text-muted-foreground text-center">
                  Wallets are automatically created when organizations or guests make transactions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <WalletTransactionsDrawer
        open={transactionsOpen}
        onClose={() => setTransactionsOpen(false)}
        walletId={selectedWalletId}
      />
      
      {selectedWalletId && (
        <WalletOperationDialog
          open={operationOpen}
          onClose={() => setOperationOpen(false)}
          walletId={selectedWalletId}
          walletName={selectedWalletName}
        />
      )}
    </div>
  );
}
