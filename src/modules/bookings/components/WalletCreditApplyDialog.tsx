import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Info } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WalletCreditApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestId: string;
  bookingTotal: number;
  onApply: (amount: number) => void;
}

export function WalletCreditApplyDialog({ open, onOpenChange, guestId, bookingTotal, onApply }: WalletCreditApplyDialogProps) {
  const { tenantId } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ['guest-wallet', guestId, tenantId],
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

  const availableBalance = wallet?.balance ? Number(wallet.balance) : 0;
  const maxApplicable = Math.min(availableBalance, bookingTotal);

  const [amountToApply, setAmountToApply] = useState(maxApplicable);

  return (
    <Dialog open={open && availableBalance > 0} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Apply Wallet Credit
          </DialogTitle>
          <DialogDescription>
            Guest has ₦{availableBalance.toLocaleString()} available in wallet credit. Would you like to apply some or all of it to this booking?
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Booking Total:</strong> ₦{bookingTotal.toLocaleString()}
            <br />
            <strong>Available Credit:</strong> ₦{availableBalance.toLocaleString()}
            <br />
            <strong>Max Applicable:</strong> ₦{maxApplicable.toLocaleString()}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
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
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              onApply(0);
              onOpenChange(false);
            }}
          >
            Don't Apply
          </Button>
          <Button 
            onClick={() => {
              if (amountToApply > 0) {
                onApply(amountToApply);
              }
              onOpenChange(false);
            }}
            disabled={amountToApply <= 0}
          >
            Apply ₦{amountToApply.toLocaleString()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
