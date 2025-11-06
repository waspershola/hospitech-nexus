import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface TenantDetailSettingsProps {
  tenant: any;
}

export default function TenantDetailSettings({ tenant }: TenantDetailSettingsProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(tenant.settings || {});

  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      const { error } = await supabase
        .from('platform_tenants')
        .update({ settings: newSettings, updated_at: new Date().toISOString() })
        .eq('id', tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenant.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update settings');
    }
  });

  const handleSaveSettings = () => {
    updateSettings.mutate(settings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Settings</CardTitle>
        <CardDescription>Configure tenant-specific settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="domain">Custom Domain</Label>
          <Input
            id="domain"
            value={settings.domain || ''}
            onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
            placeholder="custom.domain.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sms_provider">SMS Provider</Label>
          <Input
            id="sms_provider"
            value={settings.sms_provider || ''}
            onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
            placeholder="termii"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Backup</Label>
            <p className="text-sm text-muted-foreground">
              Automatic daily backups
            </p>
          </div>
          <Switch
            checked={settings.enable_backup || false}
            onCheckedChange={(checked) => 
              setSettings({ ...settings, enable_backup: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Guest Portal</Label>
            <p className="text-sm text-muted-foreground">
              Allow guests to self-check-in
            </p>
          </div>
          <Switch
            checked={settings.enable_guest_portal || false}
            onCheckedChange={(checked) => 
              setSettings({ ...settings, enable_guest_portal: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="support_contact">Support Contact</Label>
          <Input
            id="support_contact"
            value={settings.support_contact || ''}
            onChange={(e) => setSettings({ ...settings, support_contact: e.target.value })}
            placeholder="support@tenant.com"
          />
        </div>

        <Button 
          onClick={handleSaveSettings}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
