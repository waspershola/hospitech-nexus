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

interface ChangePinModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePinModal({ open, onClose }: ChangePinModalProps) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const { changePin } = useManagerPin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPin !== confirmNewPin) {
      return;
    }

    await changePin.mutateAsync({ oldPin, newPin, confirmNewPin });
    setOldPin('');
    setNewPin('');
    setConfirmNewPin('');
    onClose();
  };

  const isValid = 
    oldPin.length === 6 && 
    newPin.length === 6 && 
    confirmNewPin.length === 6 && 
    newPin === confirmNewPin &&
    oldPin !== newPin;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Manager PIN
          </DialogTitle>
          <DialogDescription>
            Update your 6-digit manager PIN. You'll need your current PIN to proceed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oldPin">Current PIN</Label>
            <Input
              id="oldPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter current PIN"
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPin">New PIN (6 digits)</Label>
            <Input
              id="newPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter new PIN"
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPin">Confirm New PIN</Label>
            <Input
              id="confirmNewPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter new PIN"
              className="text-center text-2xl tracking-widest"
            />
          </div>

          {newPin && confirmNewPin && newPin !== confirmNewPin && (
            <p className="text-sm text-destructive">New PINs do not match</p>
          )}

          {oldPin && newPin && oldPin === newPin && (
            <p className="text-sm text-destructive">New PIN must be different from current PIN</p>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={changePin.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!isValid || changePin.isPending}
            >
              {changePin.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing PIN...
                </>
              ) : (
                'Change PIN'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
