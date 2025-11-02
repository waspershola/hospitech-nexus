import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

interface GuestWalletBalanceCardProps {
  guestId: string;
  onApplyWallet: () => void;
}

export function GuestWalletBalanceCard({ guestId, onApplyWallet }: GuestWalletBalanceCardProps) {
  const { tenantId } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ['guest-wallet-balance', guestId, tenantId],
    queryFn: async () => {
      if (!tenantId || !guestId) return null;
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('owner_id', guestId)
        .eq('wallet_type', 'guest')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!guestId,
  });

  if (!wallet || Number(wallet.balance) <= 0) return null;

  return (
    <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
      <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-900 dark:text-green-100">
        Guest Wallet Balance
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold text-green-900 dark:text-green-100">
            ₦{Number(wallet.balance).toLocaleString()}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Available for payment or can pay with other methods
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onApplyWallet}
          className="border-green-600 dark:border-green-400 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
        >
          Use Wallet Credit
        </Button>
      </AlertDescription>
    </Alert>
  );
}
