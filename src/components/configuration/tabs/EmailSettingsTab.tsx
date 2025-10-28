import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';

export function EmailSettingsTab() {
  const { emailSettings, updateEmailSettings, saveEmailSettings } = useConfigStore();

  const handleChange = (field: string, value: any) => {
    updateEmailSettings({ [field]: value });
  };

  useAutoSave(saveEmailSettings, emailSettings);

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Email Sender Configuration"
        description="Configure how emails appear to recipients"
        icon={Mail}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_name">From Name</Label>
              <Input
                id="from_name"
                value={emailSettings.from_name || ''}
                onChange={(e) => handleChange('from_name', e.target.value)}
                placeholder="Grand Palace Hotel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                value={emailSettings.from_email || ''}
                onChange={(e) => handleChange('from_email', e.target.value)}
                placeholder="noreply@hotel.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reply_to">Reply-To Email (Optional)</Label>
            <Input
              id="reply_to"
              type="email"
              value={emailSettings.reply_to || ''}
              onChange={(e) => handleChange('reply_to', e.target.value)}
              placeholder="support@hotel.com"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="email_branding"
              checked={emailSettings.email_branding_enabled !== false}
              onCheckedChange={(checked) => handleChange('email_branding_enabled', checked)}
            />
            <Label htmlFor="email_branding" className="cursor-pointer">
              Include hotel branding in emails
            </Label>
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="SMTP Configuration"
        description="Custom email server settings (optional)"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="smtp_enabled"
              checked={emailSettings.smtp_enabled || false}
              onCheckedChange={(checked) => handleChange('smtp_enabled', checked)}
            />
            <Label htmlFor="smtp_enabled" className="cursor-pointer">
              Use custom SMTP server
            </Label>
          </div>

          {emailSettings.smtp_enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={emailSettings.smtp_host || ''}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={emailSettings.smtp_port || 587}
                    onChange={(e) => handleChange('smtp_port', parseInt(e.target.value))}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">SMTP Username</Label>
                  <Input
                    id="smtp_user"
                    value={emailSettings.smtp_user || ''}
                    onChange={(e) => handleChange('smtp_user', e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_password">SMTP Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={emailSettings.smtp_password || ''}
                    onChange={(e) => handleChange('smtp_password', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </ConfigCard>
    </div>
  );
}
