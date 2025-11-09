import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Power, PowerOff, Edit } from 'lucide-react';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider_type: 'twilio',
    api_key_encrypted: '',
    api_secret_encrypted: '',
    default_sender_id: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode && editingProviderId) {
      // Update existing provider
      const updates: any = {
        provider_type: formData.provider_type,
        is_active: formData.is_active,
      };
      
      // Only include credentials if they were changed (not empty)
      if (formData.api_key_encrypted) {
        updates.api_key_encrypted = formData.api_key_encrypted;
      }
      if (formData.api_secret_encrypted) {
        updates.api_secret_encrypted = formData.api_secret_encrypted;
      }
      if (formData.default_sender_id) {
        updates.default_sender_id = formData.default_sender_id;
      }
      
      await updateProvider.mutateAsync({
        id: editingProviderId,
        updates,
      });
    } else {
      // Create new provider
      await createProvider.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingProviderId(null);
    setFormData({
      provider_type: 'twilio',
      api_key_encrypted: '',
      api_secret_encrypted: '',
      default_sender_id: '',
      is_active: true,
    });
  };

  const handleEdit = (provider: any) => {
    setIsEditMode(true);
    setEditingProviderId(provider.id);
    setFormData({
      provider_type: provider.provider_type,
      api_key_encrypted: '', // Don't show encrypted values
      api_secret_encrypted: '',
      default_sender_id: provider.default_sender_id || '',
      is_active: provider.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setIsEditMode(false);
    setEditingProviderId(null);
    setFormData({
      provider_type: 'twilio',
      api_key_encrypted: '',
      api_secret_encrypted: '',
      default_sender_id: '',
      is_active: true,
    });
    setIsDialogOpen(true);
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
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit SMS Provider' : 'Add SMS Provider'}</DialogTitle>
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
                  placeholder={isEditMode ? 'Leave empty to keep current value' : ''}
                  required={!isEditMode}
                />
                {isEditMode && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty to keep the current API key
                  </p>
                )}
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
                    placeholder={isEditMode ? 'Leave empty to keep current value' : ''}
                    required={!isEditMode}
                  />
                  {isEditMode && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep the current auth token
                    </p>
                  )}
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
                    placeholder={isEditMode ? 'Leave empty to keep current value' : 'e.g., HotelMgmt'}
                    required={!isEditMode}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEditMode 
                      ? 'Update your pre-registered Termii Sender ID or leave empty to keep current'
                      : 'Enter your pre-registered Termii Sender ID'}
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
                {isEditMode ? 'Update Provider' : 'Create Provider'}
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(provider)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
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
