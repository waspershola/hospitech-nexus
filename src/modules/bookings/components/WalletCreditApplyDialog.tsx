import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet } from 'lucide-react';

interface WalletCreditApplyDialogProps {
  guestId: string;
  bookingTotal: number;
  onApply: (amountApplied: number) => void;
}

export function WalletCreditApplyDialog({ 
  guestId, 
  bookingTotal, 
  onApply 
}: WalletCreditApplyDialogProps) {
  const { data: wallet } = useQuery({
    queryKey: ['guest-wallet', guestId],
    queryFn: async () => {
      const { data } = await supabase
        .from('wallets')
        .select('*')
        .eq('wallet_type', 'guest')
        .eq('owner_id', guestId)
        .maybeSingle();
      return data;
    },
    enabled: !!guestId,
  });

  const availableBalance = wallet?.balance ? Number(wallet.balance) : 0;
  const maxApplicable = Math.min(availableBalance, bookingTotal);

  const [amountToApply, setAmountToApply] = useState(maxApplicable);

  if (availableBalance <= 0) return null;

  return (
    <Alert className="border-success bg-success/5">
      <Wallet className="h-4 w-4" />
      <AlertTitle>Wallet Balance Available</AlertTitle>
      <AlertDescription className="mt-2 space-y-4">
        <p className="text-sm">
          Guest has <strong>₦{availableBalance.toLocaleString()}</strong> in wallet credit available.
        </p>
        
        <div className="space-y-2">
          <Label htmlFor="apply-amount">Amount to Apply</Label>
          <Input
            id="apply-amount"
            type="number"
            value={amountToApply}
            onChange={(e) => {
              const val = Number(e.target.value);
              setAmountToApply(Math.min(Math.max(0, val), maxApplicable));
            }}
            max={maxApplicable}
            min={0}
            step="0.01"
          />
          <p className="text-xs text-muted-foreground">
            Maximum applicable: ₦{maxApplicable.toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => {
              if (amountToApply > 0) {
                onApply(amountToApply);
              }
            }}
            disabled={amountToApply <= 0}
          >
            Apply ₦{amountToApply.toLocaleString()}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onApply(0)}>
            Don't Apply
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}