import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface SplitChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionAmount: number;
  transactionDescription: string;
  onConfirm: (splits: { amount: number; targetFolioId: string }[]) => void;
  availableFolios: Array<{ id: string; folio_number: string; folio_type: string }>;
}

/**
 * Dialog for splitting charges across multiple folios
 * Version: MULTI-FOLIO-V1
 */
export function SplitChargeDialog({
  open,
  onOpenChange,
  transactionAmount,
  transactionDescription,
  onConfirm,
  availableFolios,
}: SplitChargeDialogProps) {
  const [splits, setSplits] = useState<Record<string, string>>({});

  const totalSplitAmount = Object.values(splits).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const isValid = Math.abs(totalSplitAmount - transactionAmount) < 0.01;

  const handleConfirm = () => {
    const splitArray = Object.entries(splits)
      .filter(([_, amount]) => parseFloat(amount) > 0)
      .map(([folioId, amount]) => ({
        amount: parseFloat(amount),
        targetFolioId: folioId,
      }));

    onConfirm(splitArray);
    onOpenChange(false);
    setSplits({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split Charge</DialogTitle>
          <DialogDescription>
            {transactionDescription} - ₦{transactionAmount.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Split amounts must total ₦{transactionAmount.toLocaleString()}
            </AlertDescription>
          </Alert>

          {availableFolios.map((folio) => (
            <div key={folio.id} className="space-y-2">
              <Label>
                {folio.folio_type} - {folio.folio_number}
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={splits[folio.id] || ''}
                onChange={(e) =>
                  setSplits({ ...splits, [folio.id]: e.target.value })
                }
              />
            </div>
          ))}

          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Total Split:</span>
              <span className={isValid ? 'text-green-600' : 'text-destructive'}>
                ₦{totalSplitAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Required:</span>
              <span>₦{transactionAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirm Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
