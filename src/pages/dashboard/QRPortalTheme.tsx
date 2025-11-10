import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ThemeSelectionCard } from '@/components/qr-portal/ThemeSelectionCard';
import { ThemePreview } from '@/components/qr-portal/ThemePreview';
import { Save, Palette, Image as ImageIcon, Wifi, UtensilsCrossed, MessageCircle, Wrench, Bell, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const THEME_OPTIONS = [
  {
    key: 'classic_luxury_gold',
    name: 'Classic Luxury Gold',
    description: 'Timeless elegance with golden accents',
    primary: '#eab308',
    accent: '#f59e0b',
    tertiary: '#d97706',
  },
  {
    key: 'modern_elegant_blue',
    name: 'Modern Elegant Blue',
    description: 'Contemporary sophistication in blue tones',
    primary: '#3b82f6',
    accent: '#0ea5e9',
    tertiary: '#06b6d4',
  },
  {
    key: 'tropical_resort_green',
    name: 'Tropical Resort Green',
    description: 'Fresh and vibrant resort atmosphere',
    primary: '#10b981',
    accent: '#14b8a6',
    tertiary: '#059669',
  },
  {
    key: 'sunset_coral',
    name: 'Sunset Coral',
    description: 'Warm and inviting coral gradients',
    primary: '#f97316',
    accent: '#ec4899',
    tertiary: '#f43f5e',
  },
  {
    key: 'royal_purple',
    name: 'Royal Purple',
    description: 'Luxurious royal purple tones',
    primary: '#a855f7',
    accent: '#a21caf',
    tertiary: '#9333ea',
    isPremium: true,
  },
];

export default function QRPortalTheme() {
  const { tenantId } = useAuth();
  const configurations = useConfigStore(state => state.configurations);
  const hotelMeta = useConfigStore(state => state.hotelMeta);
  const branding = useConfigStore(state => state.branding);
  const updateBranding = useConfigStore(state => state.updateBranding);
  const saveBranding = useConfigStore(state => state.saveBranding);
  const setTenantId = useConfigStore(state => state.setTenantId);
  const loadAllConfig = useConfigStore(state => state.loadAllConfig);
  const isLoading = useConfigStore(state => state.isLoading);
  const hasUnsaved = useConfigStore(state => state.unsavedChanges.includes('branding'));
  const error = useConfigStore(state => state.sectionErrors.branding);
  const lastSaved = useConfigStore(state => state.sectionLastSaved.branding);
  const general = configurations.general || {};

  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logo_url || null);

  // Initialize tenant ID and load configuration
  useEffect(() => {
    console.log('🎨 QRPortalTheme: tenantId from auth:', tenantId);
    if (tenantId) {
      console.log('🎨 QRPortalTheme: Setting tenantId in store and loading config');
      setTenantId(tenantId);
      loadAllConfig(tenantId);
    } else {
      console.warn('🎨 QRPortalTheme: No tenantId available from auth context');
    }
  }, [tenantId, setTenantId, loadAllConfig]);

  // Debug: Log store state
  useEffect(() => {
    const storeTenantId = useConfigStore.getState().tenantId;
    console.log('🎨 QRPortalTheme: Store tenantId:', storeTenantId);
  }, [branding]);

  const handleChange = (field: string, value: any) => {
    updateBranding({ [field]: value });
  };

  const handleThemeSelect = (themeKey: string) => {
    handleChange('qr_theme', themeKey);
    if (themeKey !== 'custom') {
      // Clear custom colors when selecting a preset
      handleChange('qr_primary_color', null);
      handleChange('qr_accent_color', null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        handleChange('logo_url', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    console.log('🎨 QRPortalTheme: handleSave called');
    console.log('🎨 QRPortalTheme: tenantId from auth:', tenantId);
    console.log('🎨 QRPortalTheme: tenantId from store:', useConfigStore.getState().tenantId);
    
    if (!tenantId) {
      console.error('🎨 QRPortalTheme: No tenantId from auth context!');
      toast.error('No tenant ID found. Please refresh and try again.');
      return;
    }
    
    // Ensure store has the tenant ID
    const storeTenantId = useConfigStore.getState().tenantId;
    if (!storeTenantId) {
      console.log('🎨 QRPortalTheme: Setting tenantId in store before save');
      setTenantId(tenantId);
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      await saveBranding();
      toast.success('Theme settings saved successfully');
    } catch (error) {
      console.error('Failed to save theme:', error);
      toast.error('Failed to save theme settings');
    }
  };

  // Show loading state while config is loading or tenant ID not ready
  if (isLoading || !tenantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {!tenantId ? 'Waiting for authentication...' : 'Loading theme settings...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-4 border-b">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">QR Portal Theme</h1>
          <p className="text-muted-foreground mt-1">
            Customize the appearance and branding of your guest QR portal
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            disabled={!hasUnsaved}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasUnsaved} className="gap-2">
            <Save className="h-4 w-4" />
            {hasUnsaved ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {lastSaved && (
        <p className="text-sm text-muted-foreground">
          Last saved: {new Date(lastSaved).toLocaleString()}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: QR Portal Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                QR Portal Theme
              </CardTitle>
              <CardDescription>
                Choose a preset theme or create your own custom color scheme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theme Selection Cards */}
              <div className="grid sm:grid-cols-2 gap-4">
                {THEME_OPTIONS.map((theme) => (
                  <ThemeSelectionCard
                    key={theme.key}
                    themeName={theme.name}
                    themeKey={theme.key}
                    description={theme.description}
                    primaryColor={theme.primary}
                    accentColor={theme.accent}
                    tertiaryColor={theme.tertiary}
                    isSelected={branding.qr_theme === theme.key}
                    isPremium={theme.isPremium}
                    onSelect={() => handleThemeSelect(theme.key)}
                  />
                ))}

                {/* Custom Theme Card */}
                <ThemeSelectionCard
                  themeName="Custom Colors"
                  themeKey="custom"
                  description="Create your own unique color scheme"
                  primaryColor={branding.qr_primary_color || '#eab308'}
                  accentColor={branding.qr_accent_color || '#f59e0b'}
                  isSelected={branding.qr_theme === 'custom'}
                  onSelect={() => handleThemeSelect('custom')}
                />
              </div>

              {/* Custom Color Pickers */}
              {branding.qr_theme === 'custom' && (
                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="qr_primary_color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="qr_primary_color"
                        type="color"
                        value={branding.qr_primary_color || '#eab308'}
                        onChange={(e) => handleChange('qr_primary_color', e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={branding.qr_primary_color || '#eab308'}
                        onChange={(e) => handleChange('qr_primary_color', e.target.value)}
                        placeholder="#eab308"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qr_accent_color">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="qr_accent_color"
                        type="color"
                        value={branding.qr_accent_color || '#f59e0b'}
                        onChange={(e) => handleChange('qr_accent_color', e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={branding.qr_accent_color || '#f59e0b'}
                        onChange={(e) => handleChange('qr_accent_color', e.target.value)}
                        placeholder="#f59e0b"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Hotel Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Hotel Branding
              </CardTitle>
              <CardDescription>
                Upload your logo and customize hotel information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Hotel Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-20 h-20 rounded-lg border-2 overflow-hidden bg-muted flex items-center justify-center">
                      <img 
                        src={logoPreview} 
                        alt="Logo Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: Square image, min 200x200px
                    </p>
                  </div>
                </div>
              </div>

              {/* Hotel Name */}
              <div className="space-y-2">
                <Label htmlFor="hotel_name">Hotel Name</Label>
                <Input
                  id="hotel_name"
                  value={general.hotelName || hotelMeta.hotel_name || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Edit hotel name in General Settings
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Default Services */}
          <Card>
            <CardHeader>
              <CardTitle>Default Services</CardTitle>
              <CardDescription>
                Enable or disable services that appear on all QR codes by default
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wifi className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="wifi" className="font-medium cursor-pointer">WiFi Access</Label>
                      <p className="text-xs text-muted-foreground">Network credentials</p>
                    </div>
                  </div>
                  <Switch
                    id="wifi"
                    checked={configurations.general?.qr_wifi_enabled ?? true}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <UtensilsCrossed className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="menu" className="font-medium cursor-pointer">Digital Menu</Label>
                      <p className="text-xs text-muted-foreground">Browse & order</p>
                    </div>
                  </div>
                  <Switch
                    id="menu"
                    checked={configurations.general?.qr_menu_enabled ?? true}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="housekeeping" className="font-medium cursor-pointer">Housekeeping</Label>
                      <p className="text-xs text-muted-foreground">Room service requests</p>
                    </div>
                  </div>
                  <Switch
                    id="housekeeping"
                    checked={true}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="maintenance" className="font-medium cursor-pointer">Maintenance</Label>
                      <p className="text-xs text-muted-foreground">Report issues</p>
                    </div>
                  </div>
                  <Switch
                    id="maintenance"
                    checked={true}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="concierge" className="font-medium cursor-pointer">Concierge</Label>
                      <p className="text-xs text-muted-foreground">Special requests</p>
                    </div>
                  </div>
                  <Switch
                    id="concierge"
                    checked={true}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="feedback" className="font-medium cursor-pointer">Feedback</Label>
                      <p className="text-xs text-muted-foreground">Guest reviews</p>
                    </div>
                  </div>
                  <Switch
                    id="feedback"
                    checked={configurations.general?.qr_feedback_enabled ?? true}
                    disabled
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Configure service availability in General Settings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Live Preview (Sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Live Preview</Label>
            </div>
            <ThemePreview
              theme={branding.qr_theme || 'classic_luxury_gold'}
              primaryColor={branding.qr_primary_color}
              accentColor={branding.qr_accent_color}
              hotelName={general.hotelName || hotelMeta.hotel_name || 'Your Hotel'}
              logoUrl={logoPreview || undefined}
            />
            <p className="text-xs text-muted-foreground text-center">
              Preview updates in real-time as you make changes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
