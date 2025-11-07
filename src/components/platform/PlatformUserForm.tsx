import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlatformRoleSelector } from './PlatformRoleSelector';
import { PasswordDeliverySelector } from './PasswordDeliverySelector';
import { Loader2 } from 'lucide-react';

interface PlatformUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    email: string; 
    full_name: string; 
    role: string;
    phone?: string;
    password_delivery_method?: 'email' | 'sms' | 'manual';
  }) => void;
  isSubmitting?: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    email: string;
    full_name: string;
    role: string;
    phone?: string;
    password_delivery_method?: 'email' | 'sms' | 'manual';
  };
}

export function PlatformUserForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  mode,
  initialData,
}: PlatformUserFormProps) {
  const [formData, setFormData] = useState(
    initialData || {
      email: '',
      full_name: '',
      role: 'support_admin',
      phone: '',
      password_delivery_method: 'email' as 'email' | 'sms' | 'manual',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isValid = formData.email && formData.full_name && formData.role;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Create Platform User' : 'Edit Platform User'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Add a new platform administrator. Choose how to deliver the temporary password.'
                : 'Update platform user details and role.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={mode === 'edit' || isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Platform Role</Label>
              <PlatformRoleSelector
                value={formData.role}
                onChange={(role) => setFormData({ ...formData, role })}
                disabled={isSubmitting}
              />
            </div>

            {mode === 'create' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone Number
                    {formData.password_delivery_method === 'sms' && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isSubmitting}
                    required={formData.password_delivery_method === 'sms'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional unless SMS delivery is selected
                  </p>
                </div>

                <PasswordDeliverySelector
                  value={formData.password_delivery_method || 'email'}
                  onChange={(method) => setFormData({ ...formData, password_delivery_method: method })}
                  disabled={isSubmitting}
                  userEmail={formData.email}
                  userPhone={formData.phone}
                />
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create User' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
