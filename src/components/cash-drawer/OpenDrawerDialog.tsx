import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCashDrawer } from '@/hooks/useCashDrawer';

interface OpenDrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenDrawerDialog({ open, onOpenChange }: OpenDrawerDialogProps) {
  const [openingBalance, setOpeningBalance] = useState('0');
  const [shift, setShift] = useState<string>('');
  const [notes, setNotes] = useState('');
  const { openDrawer, isOpening } = useCashDrawer();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openDrawer(
      {
        openingBalance: parseFloat(openingBalance) || 0,
        shift: shift || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setOpeningBalance('0');
          setShift('');
          setNotes('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open Cash Drawer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openingBalance">Opening Balance (₦)</Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about opening the drawer..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isOpening}>
              {isOpening ? 'Opening...' : 'Open Drawer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
