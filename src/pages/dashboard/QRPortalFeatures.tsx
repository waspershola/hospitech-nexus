import { useConfigStore } from '@/stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { Wifi, UtensilsCrossed, MessageSquare, Phone } from 'lucide-react';

export default function QRPortalFeatures() {
  const hotelMeta = useConfigStore(state => state.hotelMeta);
  const updateHotelMeta = useConfigStore(state => state.updateHotelMeta);
  const saveHotelMeta = useConfigStore(state => state.saveHotelMeta);
  const hasUnsaved = useConfigStore(state => state.unsavedChanges.includes('hotel_meta'));
  const error = useConfigStore(state => state.sectionErrors.hotel_meta);
  const lastSaved = useConfigStore(state => state.sectionLastSaved.hotel_meta);

  const handleChange = (field: string, value: boolean) => {
    updateHotelMeta({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">QR Portal Features</h1>
          <p className="text-muted-foreground mt-1">
            Configure which features are available in your guest QR portal
          </p>
        </div>
        <Button onClick={saveHotelMeta} disabled={!hasUnsaved} className="gap-2">
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
          <CardTitle>Guest Portal Features</CardTitle>
          <CardDescription>
            Enable or disable features that guests can access through QR codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_menu_enabled" className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                Digital Menu
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow guests to browse menu items and place orders directly from their phones
              </p>
            </div>
            <Switch
              id="qr_menu_enabled"
              checked={hotelMeta.qr_menu_enabled ?? true}
              onCheckedChange={(checked) => handleChange('qr_menu_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_wifi_enabled" className="text-base flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                WiFi Credentials
              </Label>
              <p className="text-sm text-muted-foreground">
                Display WiFi network names and passwords for guest connectivity
              </p>
            </div>
            <Switch
              id="qr_wifi_enabled"
              checked={hotelMeta.qr_wifi_enabled ?? true}
              onCheckedChange={(checked) => handleChange('qr_wifi_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_feedback_enabled" className="text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Guest Feedback
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable feedback collection and rating system for guest experiences
              </p>
            </div>
            <Switch
              id="qr_feedback_enabled"
              checked={hotelMeta.qr_feedback_enabled ?? true}
              onCheckedChange={(checked) => handleChange('qr_feedback_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="qr_calling_enabled" className="text-base flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Direct Calling
              </Label>
              <p className="text-sm text-muted-foreground">
                Show contact numbers and enable one-tap calling to front desk
              </p>
            </div>
            <Switch
              id="qr_calling_enabled"
              checked={hotelMeta.qr_calling_enabled ?? true}
              onCheckedChange={(checked) => handleChange('qr_calling_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
