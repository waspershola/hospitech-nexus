import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';

export function WalletCreditsTab() {
  const { tenantId } = useAuth();

  const { data: walletCredits, isLoading } = useQuery({
    queryKey: ['wallet-credits', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('tenant_id', tenantId)
        .gt('balance', 0)
        .order('balance', { ascending: false });
      
      if (error) throw error;
      
      // Fetch related guest/org data separately
      const enrichedWallets = await Promise.all((wallets || []).map(async (wallet) => {
        let guestData = null;
        let orgData = null;
        
        if (wallet.wallet_type === 'guest' && wallet.owner_id) {
          const { data } = await supabase
            .from('guests')
            .select('name, email, phone')
            .eq('id', wallet.owner_id)
            .maybeSingle();
          guestData = data;
        } else if (wallet.wallet_type === 'organization' && wallet.owner_id) {
          const { data } = await supabase
            .from('organizations')
            .select('name, contact_email')
            .eq('id', wallet.owner_id)
            .maybeSingle();
          orgData = data;
        }
        
        return { ...wallet, guest: guestData, organization: orgData };
      }));
      
      return enrichedWallets;
    },
    enabled: !!tenantId,
  });

  const totalCredits = walletCredits?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
  const guestWallets = walletCredits?.filter(w => w.wallet_type === 'guest').length || 0;
  const orgWallets = walletCredits?.filter(w => w.wallet_type === 'organization').length || 0;

  if (isLoading) {
    return <div className="p-6">Loading wallet credits...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Wallet Credits</p>
          <p className="text-3xl font-bold text-success">₦{totalCredits.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{walletCredits?.length || 0} wallets with balance</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Guest Wallets</p>
          <p className="text-3xl font-bold">{guestWallets}</p>
          <p className="text-xs text-muted-foreground mt-1">With available credit</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Organization Wallets</p>
          <p className="text-3xl font-bold">{orgWallets}</p>
          <p className="text-xs text-muted-foreground mt-1">With available credit</p>
        </Card>
      </div>

      {/* Credits Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Active Wallet Credits</h3>
          </div>

          {!walletCredits || walletCredits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No wallet credits</p>
              <p className="text-sm mt-2">No wallets currently have a positive balance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wallet Owner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Last Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {walletCredits?.map((wallet) => {
                    const ownerName = wallet.wallet_type === 'guest' 
                      ? (wallet.guest as any)?.name 
                      : wallet.wallet_type === 'organization'
                      ? (wallet.organization as any)?.name
                      : wallet.name || 'Department Wallet';
                    
                    const ownerEmail = wallet.wallet_type === 'guest'
                      ? (wallet.guest as any)?.email
                      : wallet.wallet_type === 'organization'
                      ? (wallet.organization as any)?.contact_email
                      : null;

                    return (
                      <TableRow key={wallet.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ownerName}</p>
                            {ownerEmail && (
                              <p className="text-xs text-muted-foreground">{ownerEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {wallet.wallet_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-success">
                          ₦{Number(wallet.balance).toLocaleString()}
                        </TableCell>
                        <TableCell>{wallet.currency}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {wallet.last_transaction_at 
                            ? new Date(wallet.last_transaction_at).toLocaleDateString()
                            : 'No transactions'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}