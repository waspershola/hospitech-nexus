import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface MergeFolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFolioId: string;
  sourceFolioNumber: string;
  availableFolios: Array<{
    id: string;
    folio_number: string;
    folio_type: string;
    balance: number;
  }>;
  onConfirm: (targetFolioId: string) => void;
  isLoading?: boolean;
}

/**
 * Dialog for merging one folio into another
 * Version: MULTI-FOLIO-V1
 */
export function MergeFolioDialog({
  open,
  onOpenChange,
  sourceFolioId,
  sourceFolioNumber,
  availableFolios,
  onConfirm,
  isLoading,
}: MergeFolioDialogProps) {
  const [targetFolioId, setTargetFolioId] = useState<string>('');

  const handleConfirm = () => {
    if (!targetFolioId) return;
    onConfirm(targetFolioId);
    setTargetFolioId('');
  };

  const targetFolios = availableFolios.filter((f) => f.id !== sourceFolioId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Folios</DialogTitle>
          <DialogDescription>
            Merge {sourceFolioNumber} into another folio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              All charges and payments from the source folio will be transferred to the target
              folio. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Target Folio</Label>
            <Select value={targetFolioId} onValueChange={setTargetFolioId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target folio" />
              </SelectTrigger>
              <SelectContent>
                {targetFolios.map((folio) => (
                  <SelectItem key={folio.id} value={folio.id}>
                    {folio.folio_type} - {folio.folio_number}
                    <span className="ml-2 text-muted-foreground">
                      (Balance: ₦{folio.balance.toLocaleString()})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetFolios.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No other open folios available to merge into.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!targetFolioId || isLoading}>
            {isLoading ? 'Merging...' : 'Merge Folios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
