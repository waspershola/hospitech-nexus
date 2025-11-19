import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMultiFolios } from '@/hooks/useMultiFolios';

interface TransferChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  transactionId: string;
  transactionAmount: number;
  currentFolioId: string;
}

/**
 * Dialog for transferring charges between folios
 * Version: MULTI-FOLIO-V1
 */
export function TransferChargeDialog({
  open,
  onOpenChange,
  bookingId,
  transactionId,
  transactionAmount,
  currentFolioId,
}: TransferChargeDialogProps) {
  const { folios, transferCharge, isTransferring } = useMultiFolios(bookingId);
  const [targetFolioId, setTargetFolioId] = useState<string>('');
  const [amount, setAmount] = useState<string>(transactionAmount.toString());

  const availableFolios = folios.filter((f) => f.id !== currentFolioId && f.status === 'open');

  const handleTransfer = () => {
    if (!targetFolioId) {
      return;
    }

    transferCharge(
      {
        transactionId,
        targetFolioId,
        amount: parseFloat(amount),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTargetFolioId('');
          setAmount(transactionAmount.toString());
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Charge</DialogTitle>
          <DialogDescription>
            Transfer this charge to another folio for this booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Target Folio</Label>
            <Select value={targetFolioId} onValueChange={setTargetFolioId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target folio" />
              </SelectTrigger>
              <SelectContent>
                {availableFolios.map((folio) => (
                  <SelectItem key={folio.id} value={folio.id}>
                    {folio.folio_type} - {folio.folio_number} (Balance: ₦
                    {folio.balance.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableFolios.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No other open folios available. Create a new folio first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={transactionAmount}
            />
            <p className="text-sm text-muted-foreground">
              Maximum: ₦{transactionAmount.toLocaleString()}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isTransferring}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={!targetFolioId || isTransferring}>
            {isTransferring ? 'Transferring...' : 'Transfer Charge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
