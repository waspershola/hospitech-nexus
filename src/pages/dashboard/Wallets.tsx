import { useState } from 'react';
import { useWallets } from '@/hooks/useWallets';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Wallet, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { WalletDetail } from '@/modules/wallets/WalletDetail';
import { CreateWalletDialog } from '@/modules/wallets/CreateWalletDialog';

export default function Wallets() {
  const { wallets, isLoading } = useWallets();
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = 
      wallet.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wallet.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || wallet.wallet_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const positiveBalanceCount = wallets.filter(w => Number(w.balance) > 0).length;
  const negativeBalanceCount = wallets.filter(w => Number(w.balance) < 0).length;

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case 'guest': return 'bg-chart-1/10 text-chart-1 border-chart-1/20';
      case 'department': return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
      case 'organization': return 'bg-chart-3/10 text-chart-3 border-chart-3/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading wallets...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display text-foreground mb-2">Wallets</h1>
            <p className="text-muted-foreground">Manage all wallet balances and transactions</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Wallet
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ₦{totalBalance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{wallets.length} wallets</p>
              </div>
              <Wallet className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Positive Balances</p>
                <p className="text-2xl font-bold text-success">{positiveBalanceCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Wallets with funds</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Negative Balances</p>
                <p className="text-2xl font-bold text-destructive">{negativeBalanceCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Wallets in debt</p>
              </div>
              <TrendingDown className="w-8 h-8 text-destructive" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWallets.map((wallet) => (
                <TableRow 
                  key={wallet.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedWalletId(wallet.id)}
                >
                  <TableCell className="font-medium">
                    {wallet.name || `${wallet.wallet_type} wallet`}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getWalletTypeColor(wallet.wallet_type)}>
                      {wallet.wallet_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{wallet.department || '-'}</TableCell>
                  <TableCell className={`font-medium ${Number(wallet.balance) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ₦{Number(wallet.balance).toLocaleString()}
                  </TableCell>
                  <TableCell>{wallet.currency}</TableCell>
                  <TableCell>
                    {wallet.last_transaction_at 
                      ? new Date(wallet.last_transaction_at).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWalletId(wallet.id);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredWallets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || typeFilter !== 'all'
                ? 'No wallets match your filters.'
                : 'No wallets created yet. Create your first wallet to get started.'}
            </div>
          )}
        </Card>
      </div>

      <WalletDetail
        walletId={selectedWalletId}
        open={!!selectedWalletId}
        onClose={() => setSelectedWalletId(null)}
      />

      <CreateWalletDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </>
  );
}
