import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { PortalPreviewCard } from '../shared/PortalPreviewCard';
import { ThemePreview } from '@/components/qr-portal/ThemePreview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hotel, MapPin, Phone, ShieldCheck, Clock, MessageSquare, Palette, Wifi, UtensilsCrossed } from 'lucide-react';

export function GeneralTab() {
  const configurations = useConfigStore(state => state.configurations);
  const hotelMeta = useConfigStore(state => state.hotelMeta);
  const branding = useConfigStore(state => state.branding);
  const updateConfig = useConfigStore(state => state.updateConfig);
  const updateHotelMeta = useConfigStore(state => state.updateHotelMeta);
  const updateBranding = useConfigStore(state => state.updateBranding);
  const saveConfig = useConfigStore(state => state.saveConfig);
  const saveHotelMeta = useConfigStore(state => state.saveHotelMeta);
  const saveBranding = useConfigStore(state => state.saveBranding);
  const hasGeneralUnsaved = useConfigStore(state => state.unsavedChanges.includes('general'));
  const hasMetaUnsaved = useConfigStore(state => state.unsavedChanges.includes('hotel_meta'));
  const hasBrandingUnsaved = useConfigStore(state => state.unsavedChanges.includes('branding'));
  const sectionError = useConfigStore(state => state.sectionErrors.general);
  const metaError = useConfigStore(state => state.sectionErrors.hotel_meta);
  const brandingError = useConfigStore(state => state.sectionErrors.branding);
  const lastSaved = useConfigStore(state => state.sectionLastSaved.general);
  const metaLastSaved = useConfigStore(state => state.sectionLastSaved.hotel_meta);
  const brandingLastSaved = useConfigStore(state => state.sectionLastSaved.branding);
  const general = configurations.general || {};

  const handleChange = (field: string, value: any) => {
    updateConfig('general', { ...general, [field]: value });
  };

  const handleMetaChange = (field: string, value: any) => {
    updateHotelMeta({ [field]: value });
  };

  const handleBrandingChange = (field: string, value: any) => {
    updateBranding({ [field]: value });
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
        title="Frontdesk Contact"
        description="Official contact number for guest notifications"
        icon={MessageSquare}
        onSave={saveHotelMeta}
        hasUnsavedChanges={hasMetaUnsaved}
        lastSaved={metaLastSaved}
        error={metaError}
        sectionKey="hotel_meta"
      >
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Frontdesk Phone Number</Label>
          <Input
            id="contact_phone"
            type="tel"
            value={hotelMeta.contact_phone || ''}
            onChange={(e) => handleMetaChange('contact_phone', e.target.value)}
            placeholder="+234 XXX XXX XXXX"
          />
          <p className="text-xs text-muted-foreground">
            This number will appear in all guest notifications (SMS and email). Leave empty to use generic contact text.
          </p>
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
        title="Operations Hours"
        description="Set check-in and check-out times"
        icon={Clock}
        onSave={() => saveConfig('general')}
        hasUnsavedChanges={hasGeneralUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="general"
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="checkInTime">Check-In Time</Label>
            <Input
              id="checkInTime"
              type="time"
              value={general.checkInTime || '14:00'}
              onChange={(e) => handleChange('checkInTime', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Guests can check in from this time onwards
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkOutTime">Check-Out Time</Label>
            <Input
              id="checkOutTime"
              type="time"
              value={general.checkOutTime || '12:00'}
              onChange={(e) => handleChange('checkOutTime', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Guests must check out by this time
            </p>
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

      {/* QR Portal Theme Customization */}
      <ConfigCard
        title="QR Portal Theme"
        description="Customize the appearance of your guest QR portal"
        icon={Palette}
        onSave={saveBranding}
        hasUnsavedChanges={hasBrandingUnsaved}
        lastSaved={brandingLastSaved}
        error={brandingError}
        sectionKey="branding"
      >
        <div className="space-y-6">
          {/* Theme Preset Selection */}
          <div className="space-y-2">
            <Label htmlFor="qr_theme">Theme Preset</Label>
            <Select
              value={branding.qr_theme || 'classic_luxury_gold'}
              onValueChange={(value) => handleBrandingChange('qr_theme', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic_luxury_gold">Classic Luxury Gold</SelectItem>
                <SelectItem value="modern_elegant_blue">Modern Elegant Blue</SelectItem>
                <SelectItem value="tropical_resort_green">Tropical Resort Green</SelectItem>
                <SelectItem value="sunset_coral">Sunset Coral</SelectItem>
                <SelectItem value="royal_purple">Royal Purple</SelectItem>
                <SelectItem value="custom">Custom Colors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Color Pickers (shown only for custom theme) */}
          {branding.qr_theme === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qr_primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="qr_primary_color"
                    type="color"
                    value={branding.qr_primary_color || '#f59e0b'}
                    onChange={(e) => handleBrandingChange('qr_primary_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={branding.qr_primary_color || '#f59e0b'}
                    onChange={(e) => handleBrandingChange('qr_primary_color', e.target.value)}
                    placeholder="#f59e0b"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr_accent_color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="qr_accent_color"
                    type="color"
                    value={branding.qr_accent_color || '#f97316'}
                    onChange={(e) => handleBrandingChange('qr_accent_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={branding.qr_accent_color || '#f97316'}
                    onChange={(e) => handleBrandingChange('qr_accent_color', e.target.value)}
                    placeholder="#f97316"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Theme Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <ThemePreview
              theme={branding.qr_theme || 'classic_luxury_gold'}
              primaryColor={branding.qr_primary_color}
              accentColor={branding.qr_accent_color}
              hotelName={general.hotelName || hotelMeta.hotel_name || 'Your Hotel'}
            />
          </div>
        </div>
      </ConfigCard>

      {/* QR Portal Features */}
      <ConfigCard
        title="QR Portal Features"
        description="Enable or disable features in your guest QR portal"
        icon={UtensilsCrossed}
        onSave={saveHotelMeta}
        hasUnsavedChanges={hasMetaUnsaved}
        lastSaved={metaLastSaved}
        error={metaError}
        sectionKey="hotel_meta"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_menu_enabled" className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Digital Menu
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow guests to browse menu and place orders
              </p>
            </div>
            <Switch
              id="qr_menu_enabled"
              checked={hotelMeta.qr_menu_enabled ?? true}
              onCheckedChange={(checked) => handleMetaChange('qr_menu_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_wifi_enabled" className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                WiFi Credentials
              </Label>
              <p className="text-sm text-muted-foreground">
                Show WiFi network details to guests
              </p>
            </div>
            <Switch
              id="qr_wifi_enabled"
              checked={hotelMeta.qr_wifi_enabled ?? true}
              onCheckedChange={(checked) => handleMetaChange('qr_wifi_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_feedback_enabled" className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Guest Feedback
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable feedback collection from guests
              </p>
            </div>
            <Switch
              id="qr_feedback_enabled"
              checked={hotelMeta.qr_feedback_enabled ?? true}
              onCheckedChange={(checked) => handleMetaChange('qr_feedback_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_calling_enabled" className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Direct Calling
              </Label>
              <p className="text-sm text-muted-foreground">
                Show contact numbers for direct calling
              </p>
            </div>
            <Switch
              id="qr_calling_enabled"
              checked={hotelMeta.qr_calling_enabled ?? true}
              onCheckedChange={(checked) => handleMetaChange('qr_calling_enabled', checked)}
            />
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
