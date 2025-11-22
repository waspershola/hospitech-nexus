import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ChangePinModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePinModal({ open, onClose }: ChangePinModalProps) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPin !== confirmPin) {
      toast.error('New PINs do not match');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      toast.error('PIN must be exactly 6 digits');
      return;
    }

    if (oldPin === newPin) {
      toast.error('New PIN must be different from current PIN');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('change-manager-pin', {
        body: {
          old_pin: oldPin,
          new_pin: newPin,
          confirm_new_pin: confirmPin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || 'Failed to change PIN');

      toast.success('Manager PIN changed successfully');
      queryClient.invalidateQueries({ queryKey: ['staff-pin-status'] });
      
      // Reset form
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      onClose();
    } catch (error: any) {
      console.error('[CHANGE-PIN] Error:', error);
      toast.error(error.message || 'Failed to change PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = 
    oldPin.length === 6 && 
    newPin.length === 6 && 
    confirmPin.length === 6 && 
    newPin === confirmPin &&
    oldPin !== newPin;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Change Manager PIN</DialogTitle>
          </div>
          <DialogDescription>
            Enter your current PIN and choose a new 6-digit PIN.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old-pin">Current PIN</Label>
            <Input
              id="old-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pin">New PIN (6 digits)</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-pin">Confirm New PIN</Label>
            <Input
              id="confirm-new-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              disabled={isSubmitting}
            />
            {confirmPin && newPin !== confirmPin && (
              <p className="text-sm text-destructive">PINs do not match</p>
            )}
            {oldPin && newPin && oldPin === newPin && (
              <p className="text-sm text-destructive">New PIN must be different</p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Change PIN
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
