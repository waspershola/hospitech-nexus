import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface WalletFlowGraphProps {
  data: Array<{
    wallet_id: string;
    wallet_name: string;
    wallet_type: string;
    balance: number;
    credit_total: number;
    debit_total: number;
    transaction_count: number;
  }>;
}

export function WalletFlowGraph({ data }: WalletFlowGraphProps) {
  const sortedWallets = useMemo(() => {
    return [...data].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [data]);

  const totalBalance = data.reduce((sum, w) => sum + w.balance, 0);
  const totalCredits = data.reduce((sum, w) => sum + w.credit_total, 0);
  const totalDebits = data.reduce((sum, w) => sum + w.debit_total, 0);
  const maxBalance = Math.max(...data.map(w => Math.abs(w.balance)), 1);

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case 'guest': return 'bg-chart-1/10 text-chart-1 border-chart-1/20';
      case 'department': return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
      case 'organization': return 'bg-chart-3/10 text-chart-3 border-chart-3/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Wallet Flow Overview
        </CardTitle>
        <CardDescription>
          Wallet balances and transaction flows
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              ₦{totalBalance.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-success" />
              Total Credits
            </p>
            <p className="text-2xl font-bold text-success">₦{totalCredits.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-destructive" />
              Total Debits
            </p>
            <p className="text-2xl font-bold text-destructive">₦{totalDebits.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-4">
          {sortedWallets.map((wallet) => {
            const netFlow = wallet.credit_total - wallet.debit_total;
            const balancePercentage = (Math.abs(wallet.balance) / maxBalance) * 100;

            return (
              <div key={wallet.wallet_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {wallet.wallet_name || `${wallet.wallet_type} wallet`}
                    </span>
                    <Badge variant="outline" className={getWalletTypeColor(wallet.wallet_type)}>
                      {wallet.wallet_type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${wallet.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ₦{wallet.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {wallet.transaction_count} transactions
                    </p>
                  </div>
                </div>

                {/* Flow visualization */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute h-full transition-all ${
                      wallet.balance >= 0 ? 'bg-success' : 'bg-destructive'
                    }`}
                    style={{ width: `${Math.min(balancePercentage, 100)}%` }}
                  />
                </div>

                {/* In/Out flow */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-muted-foreground">In:</span>
                    <span className="font-medium">₦{wallet.credit_total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-destructive" />
                    <span className="text-muted-foreground">Out:</span>
                    <span className="font-medium">₦{wallet.debit_total.toLocaleString()}</span>
                  </div>
                </div>

                {netFlow !== 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Net Flow: </span>
                    <span className={`font-medium ${netFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {netFlow >= 0 ? '+' : ''}₦{netFlow.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sortedWallets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No wallet data available for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
