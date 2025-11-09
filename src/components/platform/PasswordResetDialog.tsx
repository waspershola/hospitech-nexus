import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PasswordDeliverySelector } from './PasswordDeliverySelector';
import { User, Mail, Phone } from 'lucide-react';

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    phone?: string;
    full_name?: string;
  };
  userType: 'platform' | 'tenant';
  tenantId?: string;
  onReset: (userId: string, deliveryMethod: string) => void;
  isResetting: boolean;
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  user,
  userType,
  tenantId,
  onReset,
  isResetting,
}: PasswordResetDialogProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms' | 'manual'>('email');

  const handleReset = () => {
    if (deliveryMethod === 'sms' && !user.phone) {
      return; // Validation prevents this but defensive check
    }
    onReset(user.id, deliveryMethod);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Choose how to deliver the new temporary password to the user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{user.full_name || 'User'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>

          {/* Delivery Method Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Password Delivery Method
            </label>
            <PasswordDeliverySelector
              value={deliveryMethod}
              onChange={setDeliveryMethod}
              userEmail={user.email}
              userPhone={user.phone}
            />
          </div>

          {/* Warning for SMS without phone */}
          {deliveryMethod === 'sms' && !user.phone && (
            <p className="text-sm text-destructive">
              This user doesn't have a phone number. Please choose email or manual delivery.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={isResetting || (deliveryMethod === 'sms' && !user.phone)}
          >
            {isResetting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
