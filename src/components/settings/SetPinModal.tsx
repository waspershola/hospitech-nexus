import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SetPinModalProps {
  open: boolean;
  onClose: () => void;
}

export function SetPinModal({ open, onClose }: SetPinModalProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      toast.error('PIN must be exactly 6 digits');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('set-manager-pin', {
        body: {
          pin: newPin,
          confirm_pin: confirmPin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || 'Failed to set PIN');

      toast.success('Manager PIN set successfully');
      queryClient.invalidateQueries({ queryKey: ['staff-pin-status'] });
      
      // Reset form
      setNewPin('');
      setConfirmPin('');
      onClose();
    } catch (error: any) {
      console.error('[SET-PIN] Error:', error);
      toast.error(error.message || 'Failed to set PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = newPin.length === 6 && confirmPin.length === 6 && newPin === confirmPin;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Set Manager PIN</DialogTitle>
          </div>
          <DialogDescription>
            Create a 6-digit PIN to approve high-risk financial operations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="confirm-pin">Confirm PIN</Label>
            <Input
              id="confirm-pin"
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
              Set PIN
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
