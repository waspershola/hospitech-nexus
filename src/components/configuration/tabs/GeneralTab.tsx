import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { PortalPreviewCard } from '../shared/PortalPreviewCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Hotel, MapPin, Phone, ShieldCheck } from 'lucide-react';

export function GeneralTab() {
  const configurations = useConfigStore(state => state.configurations);
  const updateConfig = useConfigStore(state => state.updateConfig);
  const saveConfig = useConfigStore(state => state.saveConfig);
  const hasGeneralUnsaved = useConfigStore(state => state.unsavedChanges.includes('general'));
  const sectionError = useConfigStore(state => state.sectionErrors.general);
  const lastSaved = useConfigStore(state => state.sectionLastSaved.general);
  const general = configurations.general || {};

  const handleChange = (field: string, value: any) => {
    updateConfig('general', { ...general, [field]: value });
  };

  return (
    <div className="space-y-6">
      <PortalPreviewCard />
      
      <ConfigCard
        title="Hotel Information"
        description="Core details about your property"
        icon={Hotel}
        onSave={() => saveConfig('general')}
        hasUnsavedChanges={hasGeneralUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="general"
      >
        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="hotelName">Hotel Name *</Label>
            <Input
              id="hotelName"
              value={general.hotelName || ''}
              onChange={(e) => handleChange('hotelName', e.target.value)}
              placeholder="Grand Palace Hotel"
              className="transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={general.timezone || 'Africa/Lagos'}
                onChange={(e) => handleChange('timezone', e.target.value)}
                placeholder="Africa/Lagos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Input
                id="dateFormat"
                value={general.dateFormat || 'DD/MM/YYYY'}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Contact Information"
        description="How guests can reach you"
        icon={Phone}
        onSave={() => saveConfig('general')}
        hasUnsavedChanges={hasGeneralUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="general"
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={general.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+234 XXX XXX XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={general.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@hotel.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={general.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://hotel.com"
              className="flex items-center"
            />
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Address"
        description="Physical location of your property"
        icon={MapPin}
        onSave={() => saveConfig('general')}
        hasUnsavedChanges={hasGeneralUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="general"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Textarea
              id="address"
              value={general.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter full street address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={general.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Lagos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={general.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="Lagos State"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={general.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="Nigeria"
              />
            </div>
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Checkout Settings"
        description="Configure checkout and payment policies"
        icon={ShieldCheck}
        onSave={() => saveConfig('general')}
        hasUnsavedChanges={hasGeneralUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="general"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="allowCheckoutWithoutPayment" className="text-base">
              Allow Checkout Without Payment
            </Label>
            <p className="text-sm text-muted-foreground">
              When disabled, guests cannot check out until all outstanding balances are settled
            </p>
          </div>
          <Switch
            id="allowCheckoutWithoutPayment"
            checked={general.allowCheckoutWithoutPayment ?? true}
            onCheckedChange={(checked) => handleChange('allowCheckoutWithoutPayment', checked)}
          />
        </div>
      </ConfigCard>
    </div>
  );
}
