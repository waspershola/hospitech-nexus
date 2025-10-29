import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

const checkInFields = [
  { id: 'fullName', label: 'Full Name', required: true },
  { id: 'idNumber', label: 'ID Number' },
  { id: 'phone', label: 'Phone Number' },
  { id: 'email', label: 'Email Address' },
  { id: 'address', label: 'Home Address' },
  { id: 'nationality', label: 'Nationality' },
  { id: 'emergencyContact', label: 'Emergency Contact' },
];

export function GuestExperienceTab() {
  const { configurations, updateConfig, saveConfig, unsavedChanges } = useConfigStore();
  const guestExp = configurations.guestExperience || {};

  const handleChange = (field: string, value: any) => {
    updateConfig('guestExperience', { ...guestExp, [field]: value });
  };

  const handleSave = async () => {
    try {
      await saveConfig('guestExperience');
      toast.success('Guest experience settings saved');
    } catch (error) {
      toast.error('Failed to save guest experience settings');
    }
  };

  const toggleField = (fieldId: string) => {
    const fields = guestExp.requiredFields || ['fullName'];
    const updated = fields.includes(fieldId)
      ? fields.filter((f: string) => f !== fieldId)
      : [...fields, fieldId];
    handleChange('requiredFields', updated);
  };

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Check-In Requirements"
        description="Mandatory fields during guest registration"
        icon={Users}
        onSave={handleSave}
        hasUnsavedChanges={unsavedChanges.has('guestExperience')}
      >
        <div className="space-y-3">
          {checkInFields.map((field) => (
            <div key={field.id} className="flex items-center space-x-3">
              <Checkbox
                id={field.id}
                checked={(guestExp.requiredFields || ['fullName']).includes(field.id)}
                onCheckedChange={() => toggleField(field.id)}
                disabled={field.required}
              />
              <Label
                htmlFor={field.id}
                className={`cursor-pointer ${field.required ? 'text-muted-foreground' : ''}`}
              >
                {field.label}
                {field.required && <span className="text-xs ml-2">(Always Required)</span>}
              </Label>
            </div>
          ))}
        </div>
      </ConfigCard>

      <ConfigCard
        title="Default Services"
        description="Auto-enable services for new bookings"
        onSave={handleSave}
        hasUnsavedChanges={unsavedChanges.has('guestExperience')}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="autoBreakfast" className="cursor-pointer">
              Include Breakfast
            </Label>
            <Switch
              id="autoBreakfast"
              checked={guestExp.autoBreakfast || false}
              onCheckedChange={(checked) => handleChange('autoBreakfast', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoWifi" className="cursor-pointer">
              Complimentary WiFi
            </Label>
            <Switch
              id="autoWifi"
              checked={guestExp.autoWifi !== false}
              onCheckedChange={(checked) => handleChange('autoWifi', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoParking" className="cursor-pointer">
              Free Parking
            </Label>
            <Switch
              id="autoParking"
              checked={guestExp.autoParking || false}
              onCheckedChange={(checked) => handleChange('autoParking', checked)}
            />
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="QR Code Settings"
        description="Guest portal access configuration"
        onSave={handleSave}
        hasUnsavedChanges={unsavedChanges.has('guestExperience')}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="qrEnabled" className="cursor-pointer">
              Enable QR Code Access
            </Label>
            <Switch
              id="qrEnabled"
              checked={guestExp.qrEnabled !== false}
              onCheckedChange={(checked) => handleChange('qrEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="qrBranding" className="cursor-pointer">
              Include Hotel Branding
            </Label>
            <Switch
              id="qrBranding"
              checked={guestExp.qrBranding !== false}
              onCheckedChange={(checked) => handleChange('qrBranding', checked)}
            />
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
