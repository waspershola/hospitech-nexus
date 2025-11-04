import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { toast } from 'sonner';
import { Mail, Loader2, AlertCircle, Copy, Check, Key, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { SupervisorSelector } from '@/components/staff/SupervisorSelector';
import { ProfilePhotoUpload } from '@/components/staff/ProfilePhotoUpload';
import { generateEmployeeId, validatePhoneNumber, formatPhoneNumber } from '@/lib/staffUtils';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { DEPARTMENTS } from '@/lib/departments';
import { getRolesForDepartment } from '@/lib/departmentRoles';

interface InviteStaffModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteStaffModal({ open, onClose }: InviteStaffModalProps) {
  const { inviteStaff, invitations } = useStaffInvitations();
  const { staff } = useStaffManagement();
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Personal Information
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    national_id: '',
    profile_photo_url: '',
    
    // Employment Details
    employee_id: '',
    job_title: '',
    department: '',
    role: '',
    employment_type: 'full-time',
    hire_date: new Date().toISOString().split('T')[0],
    branch: '',
    shift_group: 'morning',
    supervisor_id: '',
    access_level: 'staff',
    
    // Finance & Additional
    bank_name: '',
    account_number: '',
    salary_type: 'fixed',
    base_salary: '',
    notes: '',
  });
  const [manualPassword, setManualPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [employeeIdManual, setEmployeeIdManual] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<{ value: string; label: string }[]>([]);

  // Update roles when department changes
  useEffect(() => {
    if (formData.department) {
      const roles = getRolesForDepartment(formData.department);
      setAvailableRoles(roles);
      
      // Reset role if currently selected role is not valid for new department
      if (formData.role && !roles.find(r => r.value === formData.role)) {
        setFormData(prev => ({ ...prev, role: '' }));
      }
    } else {
      setAvailableRoles([]);
    }
  }, [formData.department]);

  // Auto-generate employee ID when department changes
  useEffect(() => {
    if (formData.department && !employeeIdManual && staff) {
      const existingIds = staff.map(s => s.metadata?.employee_id).filter(Boolean);
      const year = new Date().getFullYear();
      let sequence = 1;
      
      // Find next sequence for department and year
      const deptPrefix: Record<string, string> = {
        front_office: 'FRD',
        housekeeping: 'HSK',
        food_beverage: 'FNB',
        kitchen: 'KIT',
        bar: 'BAR',
        maintenance: 'MNT',
        security: 'SEC',
        finance: 'FIN',
        management: 'MGT',
        spa: 'SPA',
        concierge: 'CON',
        admin: 'ADM',
        inventory: 'INV',
        hr: 'HRD',
      };
      const prefix = deptPrefix[formData.department] || 'STF';
      
      const pattern = `${prefix}-${year}`;
      const matchingIds = existingIds.filter(id => id.startsWith(pattern));
      
      if (matchingIds.length > 0) {
        const sequences = matchingIds.map(id => {
          const match = id.match(/-(\d{3})$/);
          return match ? parseInt(match[1], 10) : 0;
        });
        sequence = Math.max(...sequences) + 1;
      }
      
      const newId = generateEmployeeId(formData.department, year, sequence);
      setFormData(prev => ({ ...prev, employee_id: newId }));
    }
  }, [formData.department, employeeIdManual, staff]);

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
    
    // Validate phone number
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      toast.error('Please enter a valid Nigerian phone number');
      return;
    }
    
    try {
      // Format phone number
      const phoneFormatted = formData.phone ? formatPhoneNumber(formData.phone) : undefined;
      
      // Prepare metadata
      const metadata = {
        employee_id: formData.employee_id,
        job_title: formData.job_title,
        employment_type: formData.employment_type,
        hire_date: formData.hire_date,
        shift_group: formData.shift_group,
        access_level: formData.access_level,
        ...(formData.gender && { gender: formData.gender }),
        ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
        ...(formData.national_id && { national_id: formData.national_id }),
        ...(formData.profile_photo_url && { profile_photo_url: formData.profile_photo_url }),
        ...(formData.bank_name && {
          bank_details: {
            bank_name: formData.bank_name,
            account_number: formData.account_number,
          },
        }),
        ...(formData.base_salary && {
          compensation: {
            salary_type: formData.salary_type,
            base_salary: parseFloat(formData.base_salary),
            currency: 'NGN',
          },
        }),
        ...(formData.notes && { onboarding_notes: formData.notes }),
      };
      
      const result = await inviteStaff.mutateAsync({
        full_name: formData.full_name,
        email: formData.email,
        phone: phoneFormatted,
        department: formData.department,
        role: formData.role,
        branch: formData.branch || undefined,
        supervisor_id: formData.supervisor_id && formData.supervisor_id !== 'none' 
          ? formData.supervisor_id 
          : undefined,
        metadata,
        generate_password: manualPassword,
      });
      
      if (result?.password) {
        // Password was generated, show it to the user
        setGeneratedPassword(result.password);
      } else {
        // Normal email invitation sent, close modal
        handleClose();
      }
    } catch (error) {
      console.error('[InviteStaffModal] Invitation failed:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      gender: '',
      date_of_birth: '',
      national_id: '',
      profile_photo_url: '',
      employee_id: '',
      job_title: '',
      department: '',
      role: '',
      employment_type: 'full-time',
      hire_date: new Date().toISOString().split('T')[0],
      branch: '',
      shift_group: 'morning',
      supervisor_id: '',
      access_level: 'staff',
      bank_name: '',
      account_number: '',
      salary_type: 'fixed',
      base_salary: '',
      notes: '',
    });
    setManualPassword(false);
    setGeneratedPassword(null);
    setCopied(false);
    setEmployeeIdManual(false);
    setActiveTab('personal');
    onClose();
  };

  // Show finance tab only to owners/HR
  const showFinanceTab = role === 'owner' || role === 'manager';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <DialogDescription>
            {generatedPassword 
              ? 'Save the password below and share it securely with the staff member.'
              : 'Fill in the staff member details to send them an invitation email or create their account with a manual password.'}
          </DialogDescription>
        </DialogHeader>

        {!generatedPassword ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                {showFinanceTab && <TabsTrigger value="finance">Finance</TabsTrigger>}
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              {/* Tab 1: Personal Information */}
              <TabsContent value="personal" className="space-y-4">
                <ProfilePhotoUpload
                  value={formData.profile_photo_url}
                  onChange={(url) => setFormData({ ...formData, profile_photo_url: url || '' })}
                  staffName={formData.full_name}
                />

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
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 801 234 5678"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender (Optional)</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth (Optional)</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="national_id">National ID / Passport (Optional)</Label>
                    <Input
                      id="national_id"
                      value={formData.national_id}
                      onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                      placeholder="e.g., 12345678901"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Employment Details */}
              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="employee_id"
                        value={formData.employee_id}
                        onChange={(e) => {
                          setFormData({ ...formData, employee_id: e.target.value });
                          setEmployeeIdManual(true);
                        }}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEmployeeIdManual(false);
                          // Trigger re-generation by clearing and re-setting department
                          const dept = formData.department;
                          setFormData(prev => ({ ...prev, department: '' }));
                          setTimeout(() => setFormData(prev => ({ ...prev, department: dept })), 10);
                        }}
                        title="Auto-generate"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto-generated based on department
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title *</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      placeholder="e.g., Front Desk Supervisor"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                      required
                    >
                      <SelectTrigger id="department">
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
                      disabled={!formData.department}
                      required
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder={formData.department ? "Select role" : "Select department first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employment_type">Employment Type *</Label>
                    <Select
                      value={formData.employment_type}
                      onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
                    >
                      <SelectTrigger id="employment_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Hire Date *</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch (Optional)</Label>
                    <Input
                      id="branch"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      placeholder="e.g., Lagos, Abuja"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift_group">Shift Group *</Label>
                    <Select
                      value={formData.shift_group}
                      onValueChange={(value) => setFormData({ ...formData, shift_group: value })}
                    >
                      <SelectTrigger id="shift_group">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (6AM - 2PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (2PM - 10PM)</SelectItem>
                        <SelectItem value="night">Night (10PM - 6AM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <SupervisorSelector
                      value={formData.supervisor_id}
                      onChange={(value) => setFormData({ ...formData, supervisor_id: value })}
                      department={formData.department}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access_level">Access Level</Label>
                    <Select
                      value={formData.access_level}
                      onValueChange={(value) => setFormData({ ...formData, access_level: value })}
                    >
                      <SelectTrigger id="access_level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Finance & Additional */}
              {showFinanceTab && (
                <TabsContent value="finance" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name (Optional)</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g., Access Bank"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account_number">Account Number (Optional)</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="0123456789"
                        maxLength={10}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salary_type">Salary Type (Optional)</Label>
                      <Select
                        value={formData.salary_type}
                        onValueChange={(value) => setFormData({ ...formData, salary_type: value })}
                      >
                        <SelectTrigger id="salary_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="commission">Commission</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="base_salary">Base Salary (₦) (Optional)</Label>
                      <Input
                        id="base_salary"
                        type="number"
                        value={formData.base_salary}
                        onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                        placeholder="150000"
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="notes">Notes / Special Instructions (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Any special requirements, restrictions, or notes..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Financial information is confidential and only visible to owners and HR managers.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              )}

              {/* Tab 4: Account Setup */}
              <TabsContent value="account" className="space-y-4">
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
              </TabsContent>
            </Tabs>

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
