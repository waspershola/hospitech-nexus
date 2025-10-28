import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Hotel, User, Shield } from 'lucide-react';

export default function Settings() {
  const { user, role, tenantId, tenantName } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hotelSettings, setHotelSettings] = useState({
    name: tenantName || '',
    domain: '',
    brandColor: '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: hotelSettings.name,
          domain: hotelSettings.domain || null,
          brand_color: hotelSettings.brandColor || null,
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: 'Settings updated',
        description: 'Your hotel settings have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and hotel preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-display text-foreground">Account Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">User ID</Label>
              <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
            </div>
          </div>
        </Card>

        {/* Role & Permissions */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-display text-foreground">Role & Permissions</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Current Role</Label>
              <p className="font-medium capitalize">{role}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Tenant ID</Label>
              <p className="font-mono text-xs text-muted-foreground">{tenantId}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Hotel Settings - Only for owner/manager */}
      {(role === 'owner' || role === 'manager') && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Hotel className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-display text-foreground">Hotel Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your hotel's profile and branding</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hotelName">Hotel Name</Label>
                <Input
                  id="hotelName"
                  value={hotelSettings.name}
                  onChange={(e) => setHotelSettings({ ...hotelSettings, name: e.target.value })}
                  placeholder="Grand Plaza Hotel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Custom Domain (Optional)</Label>
                <Input
                  id="domain"
                  value={hotelSettings.domain}
                  onChange={(e) => setHotelSettings({ ...hotelSettings, domain: e.target.value })}
                  placeholder="hotel.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandColor"
                    type="color"
                    value={hotelSettings.brandColor || '#D4AF37'}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, brandColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={hotelSettings.brandColor || '#D4AF37'}
                    onChange={(e) => setHotelSettings({ ...hotelSettings, brandColor: e.target.value })}
                    placeholder="#D4AF37"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}