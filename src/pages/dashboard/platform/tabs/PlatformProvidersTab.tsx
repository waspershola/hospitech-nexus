import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Power, PowerOff } from 'lucide-react';
import { usePlatformProviders } from '@/hooks/usePlatformProviders';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export function PlatformProvidersTab() {
  const { providers, isLoading, createProvider, updateProvider } = usePlatformProviders();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    provider_type: 'twilio',
    api_key_encrypted: '',
    api_secret_encrypted: '',
    default_sender_id: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProvider.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({
      provider_type: 'twilio',
      api_key_encrypted: '',
      api_secret_encrypted: '',
      default_sender_id: '',
      is_active: true,
    });
  };

  const toggleProviderStatus = async (id: string, currentStatus: boolean) => {
    await updateProvider.mutateAsync({
      id,
      updates: { is_active: !currentStatus },
    });
  };

  if (isLoading) {
    return <div>Loading providers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">SMS Providers</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add SMS Provider</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select
                  value={formData.provider_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, provider_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="termii">Termii</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key / Account SID</Label>
                <Input
                  value={formData.api_key_encrypted}
                  onChange={(e) =>
                    setFormData({ ...formData, api_key_encrypted: e.target.value })
                  }
                  required
                />
              </div>

              {formData.provider_type === 'twilio' && (
                <div className="space-y-2">
                  <Label>Auth Token</Label>
                  <Input
                    type="password"
                    value={formData.api_secret_encrypted}
                    onChange={(e) =>
                      setFormData({ ...formData, api_secret_encrypted: e.target.value })
                    }
                    required
                  />
                </div>
              )}

              {formData.provider_type === 'termii' && (
                <div className="space-y-2">
                  <Label>Sender ID (Registered with Termii)</Label>
                  <Input
                    value={formData.default_sender_id}
                    onChange={(e) =>
                      setFormData({ ...formData, default_sender_id: e.target.value })
                    }
                    placeholder="e.g., HotelMgmt"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your pre-registered Termii Sender ID
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>

              <Button type="submit" className="w-full">
                Create Provider
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {providers?.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {provider.provider_type.toUpperCase()}
                    {provider.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {new Date(provider.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleProviderStatus(provider.id, provider.is_active)}
                >
                  {provider.is_active ? (
                    <PowerOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Power className="h-4 w-4 mr-2" />
                  )}
                  {provider.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>API Key: {provider.api_key_encrypted.substring(0, 12)}...</div>
                {provider.default_sender_id && (
                  <div className="flex items-center gap-2">
                    Sender ID: <Badge variant="outline">{provider.default_sender_id}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
