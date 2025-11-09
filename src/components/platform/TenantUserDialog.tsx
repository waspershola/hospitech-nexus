import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PasswordDeliverySelector } from '@/components/platform/PasswordDeliverySelector';
import { useState, useEffect } from 'react';
import { TenantUser } from '@/hooks/useTenantUsers';

interface TenantUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialData?: TenantUser;
}

export function TenantUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  mode,
  initialData,
}: TenantUserDialogProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('');
  const [passwordDeliveryMethod, setPasswordDeliveryMethod] = useState<'email' | 'sms' | 'manual'>('email');

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setEmail(initialData.email);
      setFullName(initialData.full_name || '');
      setPhone(initialData.phone || '');
      setRole(initialData.role);
      setPasswordDeliveryMethod('email');
    } else {
      setEmail('');
      setFullName('');
      setPhone('');
      setRole('staff');
      setPassword('');
      setPasswordDeliveryMethod('email');
    }
  }, [mode, initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      onSubmit({
        email,
        full_name: fullName,
        phone,
        role,
        password: password || undefined,
        password_delivery_method: passwordDeliveryMethod,
      });
    } else {
      onSubmit({ 
        user_id: initialData?.id, 
        full_name: fullName, 
        role 
      });
    }
  };

  const isValid = mode === 'edit' 
    ? fullName.trim() !== '' 
    : email.trim() !== '' && fullName.trim() !== '' && (passwordDeliveryMethod === 'sms' ? phone.trim() !== '' : true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New User' : 'Edit User'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Add a new user to this tenant account'
              : 'Update user information and role'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={mode === 'edit'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone {passwordDeliveryMethod === 'sms' && '*'}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234..."
              required={passwordDeliveryMethod === 'sms'}
            />
            {passwordDeliveryMethod === 'sms' && (
              <p className="text-xs text-muted-foreground">Phone required for SMS delivery</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'create' && (
            <>
              <PasswordDeliverySelector
                value={passwordDeliveryMethod}
                onChange={setPasswordDeliveryMethod}
                userEmail={email}
                userPhone={phone}
              />
              
              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
                <p className="text-xs text-muted-foreground">
                  A secure password will be generated if left blank
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
