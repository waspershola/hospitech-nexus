import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCashDrawer } from '@/hooks/useCashDrawer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface CloseDrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawer: any;
}

export function CloseDrawerDialog({ open, onOpenChange, drawer }: CloseDrawerDialogProps) {
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const { closeDrawer, isClosing, calculateExpectedCash, isCalculating } = useCashDrawer();

  const openingBalance = drawer?.metadata?.opening_balance || 0;
  const expectedBalance = openingBalance; // TODO: Add cash transactions
  const variance = parseFloat(closingBalance || '0') - expectedBalance;
  const hasVariance = Math.abs(variance) > 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer) return;

    closeDrawer(
      {
        drawerId: drawer.id,
        closingBalance: parseFloat(closingBalance) || 0,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setClosingBalance('');
          setNotes('');
        },
      }
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Cash Drawer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opening Balance:</span>
              <span className="font-medium">{formatCurrency(openingBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Balance:</span>
              <span className="font-medium">{formatCurrency(expectedBalance)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closingBalance">Counted Closing Balance (₦)</Label>
            <Input
              id="closingBalance"
              type="number"
              step="0.01"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {closingBalance && hasVariance && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Variance detected: {formatCurrency(variance)}
                <br />
                <span className="text-xs">
                  {variance > 0 ? 'Overage' : 'Shortage'} from expected balance
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="closingNotes">Notes (Optional)</Label>
            <Textarea
              id="closingNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about closing the drawer or variance..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isClosing} variant="destructive">
              {isClosing ? 'Closing...' : 'Close Drawer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
