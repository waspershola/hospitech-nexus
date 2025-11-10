import { useConfigStore } from '@/stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemePreview } from '@/components/qr-portal/ThemePreview';
import { Save, Palette } from 'lucide-react';

export default function QRPortalTheme() {
  const configurations = useConfigStore(state => state.configurations);
  const hotelMeta = useConfigStore(state => state.hotelMeta);
  const branding = useConfigStore(state => state.branding);
  const updateBranding = useConfigStore(state => state.updateBranding);
  const saveBranding = useConfigStore(state => state.saveBranding);
  const hasUnsaved = useConfigStore(state => state.unsavedChanges.includes('branding'));
  const error = useConfigStore(state => state.sectionErrors.branding);
  const lastSaved = useConfigStore(state => state.sectionLastSaved.branding);
  const general = configurations.general || {};

  const handleChange = (field: string, value: any) => {
    updateBranding({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">QR Portal Theme</h1>
          <p className="text-muted-foreground mt-1">
            Customize the appearance and branding of your guest QR portal
          </p>
        </div>
        <Button onClick={saveBranding} disabled={!hasUnsaved} className="gap-2">
          <Save className="h-4 w-4" />
          {hasUnsaved ? 'Save Changes' : 'Saved'}
        </Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Customization
          </CardTitle>
          <CardDescription>
            Choose a preset theme or create your own custom color scheme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Preset Selection */}
          <div className="space-y-2">
            <Label htmlFor="qr_theme">Theme Preset</Label>
            <Select
              value={branding.qr_theme || 'classic_luxury_gold'}
              onValueChange={(value) => handleChange('qr_theme', value)}
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
            <p className="text-xs text-muted-foreground">
              Select a predefined theme or choose "Custom Colors" to create your own
            </p>
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
                    onChange={(e) => handleChange('qr_primary_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={branding.qr_primary_color || '#f59e0b'}
                    onChange={(e) => handleChange('qr_primary_color', e.target.value)}
                    placeholder="#f59e0b"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Main brand color for buttons and accents
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr_accent_color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="qr_accent_color"
                    type="color"
                    value={branding.qr_accent_color || '#f97316'}
                    onChange={(e) => handleChange('qr_accent_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={branding.qr_accent_color || '#f97316'}
                    onChange={(e) => handleChange('qr_accent_color', e.target.value)}
                    placeholder="#f97316"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Secondary color for highlights and hover states
                </p>
              </div>
            </div>
          )}

          {/* Theme Preview */}
          <div className="space-y-2">
            <Label>Live Preview</Label>
            <div className="rounded-lg border bg-muted/30 p-6">
              <ThemePreview
                theme={branding.qr_theme || 'classic_luxury_gold'}
                primaryColor={branding.qr_primary_color}
                accentColor={branding.qr_accent_color}
                hotelName={general.hotelName || hotelMeta.hotel_name || 'Your Hotel'}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Preview how your QR portal will appear to guests with the selected theme
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
