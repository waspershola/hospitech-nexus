import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { Mail, Loader2 } from 'lucide-react';

interface InviteStaffModalProps {
  open: boolean;
  onClose: () => void;
}

const DEPARTMENTS = [
  { value: 'front_office', label: 'Front Office' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'security', label: 'Security' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'hr', label: 'HR' },
  { value: 'management', label: 'Management' },
];

const ROLES = [
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'guest_service_agent', label: 'Guest Service Agent' },
  { value: 'room_attendant', label: 'Room Attendant' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'cook', label: 'Cook' },
  { value: 'store_clerk', label: 'Store Clerk' },
  { value: 'technician', label: 'Technician' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'admin_officer', label: 'Admin Officer' },
];

export function InviteStaffModal({ open, onClose }: InviteStaffModalProps) {
  const { inviteStaff } = useStaffInvitations();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    role: '',
    branch: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteStaff.mutateAsync(formData);
      // Only reset form and close modal on success
      setFormData({
        full_name: '',
        email: '',
        department: '',
        role: '',
        branch: '',
      });
      onClose();
    } catch (error) {
      // Error is already handled by mutation's onError
      // Just prevent form reset and keep modal open
      console.error('[InviteStaffModal] Invitation failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <DialogTitle>Invite Staff Member</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="branch">Branch (Optional)</Label>
              <Input
                id="branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                placeholder="e.g., Lagos, Abuja"
              />
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              An invitation email will be sent to <strong>{formData.email || 'the email address'}</strong> with 
              instructions to setup their account and join the team.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviteStaff.isPending}
            >
              {inviteStaff.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
