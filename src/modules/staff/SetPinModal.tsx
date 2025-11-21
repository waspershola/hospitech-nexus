import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useManagerPin } from '@/hooks/useManagerPin';
import { KeyRound, Loader2 } from 'lucide-react';

interface SetPinModalProps {
  open: boolean;
  onClose: () => void;
}

export function SetPinModal({ open, onClose }: SetPinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const { setPin: setPinMutation } = useManagerPin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin !== confirmPin) {
      return;
    }

    await setPinMutation.mutateAsync({ pin, confirmPin });
    setPin('');
    setConfirmPin('');
    onClose();
  };

  const isValid = pin.length === 6 && confirmPin.length === 6 && pin === confirmPin;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Set Manager PIN
          </DialogTitle>
          <DialogDescription>
            Set a 6-digit PIN to approve high-risk financial operations like overpayments, refunds, and write-offs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN (6 digits)</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit PIN"
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter PIN"
              className="text-center text-2xl tracking-widest"
            />
          </div>

          {pin && confirmPin && pin !== confirmPin && (
            <p className="text-sm text-destructive">PINs do not match</p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={setPinMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!isValid || setPinMutation.isPending}
            >
              {setPinMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting PIN...
                </>
              ) : (
                'Set PIN'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
