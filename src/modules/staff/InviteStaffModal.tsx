import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { Mail, Loader2, AlertCircle, Copy, Check, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

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
  const { inviteStaff, invitations } = useStaffInvitations();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: '',
    role: '',
    branch: '',
  });
  const [manualPassword, setManualPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check if email already has pending invitation
  const pendingInvitations = invitations?.filter(
    inv => inv.status === 'pending' && new Date(inv.expires_at) > new Date()
  ) || [];
  
  const existingInvitation = pendingInvitations.find(
    inv => inv.email.toLowerCase() === formData.email.toLowerCase()
  );

  const handleCopy = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await inviteStaff.mutateAsync({
        ...formData,
        generate_password: manualPassword,
      });
      
      if (result?.password) {
        // Password was generated, show it to the user
        setGeneratedPassword(result.password);
      } else {
        // Normal email invitation sent, close modal
        setFormData({
          full_name: '',
          email: '',
          department: '',
          role: '',
          branch: '',
        });
        setManualPassword(false);
        setGeneratedPassword(null);
        onClose();
      }
    } catch (error) {
      console.error('[InviteStaffModal] Invitation failed:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      department: '',
      role: '',
      branch: '',
    });
    setManualPassword(false);
    setGeneratedPassword(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {generatedPassword ? (
              <Key className="h-5 w-5 text-amber-600" />
            ) : (
              <Mail className="h-5 w-5 text-primary" />
            )}
            <DialogTitle>
              {generatedPassword ? 'Staff Account Created' : 'Invite Staff Member'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!generatedPassword ? (
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

            {existingInvitation && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This email already has a pending invitation sent on{' '}
                  {new Date(existingInvitation.created_at).toLocaleDateString()}.
                  Please cancel the existing invitation first or use the "Resend" button.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="manual-password" className="text-base font-medium">
                  Generate Password Manually
                </Label>
                <p className="text-sm text-muted-foreground">
                  Create account with a temporary password instead of sending an email invitation
                </p>
              </div>
              <Switch
                id="manual-password"
                checked={manualPassword}
                onCheckedChange={setManualPassword}
              />
            </div>

            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                {manualPassword ? (
                  <>
                    <strong>⚠️ Manual Setup:</strong> A staff account will be created with a temporary password that you'll need to share manually with <strong>{formData.email || 'the staff member'}</strong>.
                  </>
                ) : (
                  <>
                    An invitation email will be sent to <strong>{formData.email || 'the email address'}</strong> with 
                    instructions to setup their account and join the team.
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteStaff.isPending || !!existingInvitation}
              >
                {inviteStaff.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {manualPassword ? 'Creating Account...' : 'Sending Invitation...'}
                  </>
                ) : (
                  <>
                    {manualPassword ? (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Create Account
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">
                ✓ Account created successfully for {formData.full_name}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700 font-medium mb-2">Temporary Password:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-lg font-mono text-amber-600 font-bold">
                  {generatedPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Important:</strong> Please share this password with {formData.full_name} at {formData.email}. They must change it on their first login.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>🔒 Security:</strong> The staff member will be required to change this password on their next login.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
