import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWiFiManagement, WiFiCredential } from '@/hooks/useWiFiManagement';
import { ConfigCard } from '../shared/ConfigCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, Plus, Pencil, Trash2, QrCode, Eye, EyeOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function WiFiManagementTab() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { createCredential, updateCredential, deleteCredential, isLoading: isSaving } = useWiFiManagement();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WiFiCredential | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [qrPreview, setQrPreview] = useState<WiFiCredential | null>(null);

  const [formData, setFormData] = useState<WiFiCredential>({
    location: '',
    network_name: '',
    password: '',
    instructions: '',
    is_active: true,
    display_order: 0,
  });

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['wifi-credentials', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('wifi_credentials')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as WiFiCredential[];
    },
    enabled: !!tenantId,
  });

  const handleSubmit = async () => {
    if (editingItem?.id) {
      await updateCredential(editingItem.id, formData);
    } else {
      await createCredential(formData);
    }
    queryClient.invalidateQueries({ queryKey: ['wifi-credentials'] });
    handleCloseDialog();
  };

  const handleEdit = (item: WiFiCredential) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this WiFi credential?')) {
      await deleteCredential(id);
      queryClient.invalidateQueries({ queryKey: ['wifi-credentials'] });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      location: '',
      network_name: '',
      password: '',
      instructions: '',
      is_active: true,
      display_order: 0,
    });
  };

  const generateWiFiQR = (cred: WiFiCredential) => {
    // WiFi QR format: WIFI:T:WPA;S:SSID;P:password;;
    return `WIFI:T:WPA;S:${cred.network_name};P:${cred.password};;`;
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <ConfigCard
        title="WiFi Credentials"
        description="Manage WiFi networks for guest access"
        icon={Wifi}
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleCloseDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add WiFi Network
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Edit WiFi Credentials' : 'Add WiFi Credentials'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem ? 'Update the WiFi network details' : 'Add a new WiFi network for guest access'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Main Lobby, Poolside, All Areas"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="network_name">Network Name (SSID) *</Label>
                    <Input
                      id="network_name"
                      value={formData.network_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, network_name: e.target.value }))}
                      placeholder="Hotel_Guest_WiFi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter WiFi password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions (Optional)</Label>
                    <Textarea
                      id="instructions"
                      value={formData.instructions || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="e.g., Connect to the network and open any browser..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="active">Active</Label>
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={isSaving || !formData.location || !formData.network_name || !formData.password}>
                    {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Wifi className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No WiFi credentials yet. Add your first network!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {credentials.map(cred => (
                <Card key={cred.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Wifi className="h-5 w-5 text-primary" />
                        {cred.location}
                      </CardTitle>
                      <Badge variant={cred.is_active ? 'default' : 'secondary'}>
                        {cred.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Network Name</p>
                      <p className="font-mono font-semibold">{cred.network_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Password</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold">
                          {cred.id && showPasswords[cred.id] ? cred.password : '••••••••'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cred.id && togglePasswordVisibility(cred.id)}
                        >
                          {cred.id && showPasswords[cred.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {cred.instructions && (
                      <div>
                        <p className="text-sm text-muted-foreground">Instructions</p>
                        <p className="text-sm">{cred.instructions}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQrPreview(cred)}
                        className="flex-1"
                      >
                        <QrCode className="h-3 w-3 mr-1" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(cred)}
                        className="flex-1"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cred.id && handleDelete(cred.id)}
                        className="flex-1"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ConfigCard>

      {/* QR Code Preview Dialog */}
      <Dialog open={!!qrPreview} onOpenChange={(open) => !open && setQrPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>WiFi QR Code - {qrPreview?.location}</DialogTitle>
            <DialogDescription>
              Scan this QR code to automatically connect to the WiFi network
            </DialogDescription>
          </DialogHeader>
          {qrPreview && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={generateWiFiQR(qrPreview)} size={256} />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">{qrPreview.network_name}</p>
                <p className="text-sm text-muted-foreground">
                  Scan to connect automatically
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
