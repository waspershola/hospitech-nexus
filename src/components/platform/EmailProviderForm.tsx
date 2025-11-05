import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EmailProvider } from '@/hooks/useEmailProviders';

interface EmailProviderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<EmailProvider>) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialData?: EmailProvider;
}

export function EmailProviderForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  mode,
  initialData,
}: EmailProviderFormProps) {
  const [providerType, setProviderType] = useState<string>(initialData?.provider_type || 'smtp');
  const [name, setName] = useState(initialData?.name || '');
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false);
  const [enabled, setEnabled] = useState(initialData?.enabled !== false);
  
  // SMTP config
  const [smtpHost, setSmtpHost] = useState(initialData?.config?.host || '');
  const [smtpPort, setSmtpPort] = useState(initialData?.config?.port || '587');
  const [smtpUser, setSmtpUser] = useState(initialData?.config?.user || '');
  const [smtpPassword, setSmtpPassword] = useState(initialData?.config?.password || '');
  const [smtpSecure, setSmtpSecure] = useState(initialData?.config?.secure || false);
  
  // API-based providers
  const [apiKey, setApiKey] = useState(initialData?.config?.apiKey || '');
  const [domain, setDomain] = useState(initialData?.config?.domain || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let config: any = {};
    
    if (providerType === 'smtp') {
      config = {
        host: smtpHost,
        port: parseInt(smtpPort),
        user: smtpUser,
        password: smtpPassword,
        secure: smtpSecure,
      };
    } else if (providerType === 'mailgun') {
      config = {
        apiKey,
        domain,
      };
    } else {
      config = { apiKey };
    }

    onSubmit({
      ...(mode === 'edit' && initialData?.id ? { id: initialData.id } : {}),
      provider_type: providerType as any,
      name,
      config,
      is_default: isDefault,
      enabled,
    });
  };

  const isValid = name && (
    (providerType === 'smtp' && smtpHost && smtpPort && smtpUser && smtpPassword) ||
    (providerType === 'mailgun' && apiKey && domain) ||
    (['sendgrid', 'resend'].includes(providerType) && apiKey)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add Email Provider' : 'Edit Email Provider'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Provider Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production SMTP"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider_type">Provider Type</Label>
            <Select value={providerType} onValueChange={setProviderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smtp">SMTP</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {providerType === 'smtp' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="host">SMTP Host</Label>
                <Input
                  id="host"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">SMTP Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user">SMTP Username</Label>
                <Input
                  id="user"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">SMTP Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  checked={smtpSecure}
                  onCheckedChange={setSmtpSecure}
                />
                <Label htmlFor="secure">Use TLS/SSL</Label>
              </div>
            </>
          )}

          {providerType === 'mailgun' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="key-..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="mg.yourdomain.com"
                  required
                />
              </div>
            </>
          )}

          {['sendgrid', 'resend'].includes(providerType) && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={providerType === 'sendgrid' ? 'SG...' : 're_...'}
                required
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="is_default">Set as Default Provider</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Provider' : 'Update Provider'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
