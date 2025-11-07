import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface TenantDetailAddonsProps {
  tenant: any;
}

export default function TenantDetailAddons({ tenant }: TenantDetailAddonsProps) {
  const queryClient = useQueryClient();
  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch available addons
  const { data: addons } = useQuery({
    queryKey: ['platform-addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_addons')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch tenant's addon purchases
  const { data: purchases, isLoading } = useQuery({
    queryKey: ['tenant-addon-purchases', tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_addon_purchases')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('purchased_at', { ascending: false });
      
      if (error) {
        console.error('[TenantDetailAddons] Error fetching purchases:', error);
        throw error;
      }

      // Fetch addon details for each purchase
      if (data && data.length > 0) {
        const addonIds = [...new Set(data.map(p => p.addon_id))];
        const { data: addonsData, error: addonsError } = await supabase
          .from('platform_addons')
          .select('*')
          .in('id', addonIds);

        if (addonsError) {
          console.error('[TenantDetailAddons] Error fetching addons:', addonsError);
        }

        // Map addon data to purchases
        const purchasesWithAddons = data.map(purchase => ({
          ...purchase,
          addon: addonsData?.find(a => a.id === purchase.addon_id)
        }));

        return purchasesWithAddons;
      }

      return data;
    },
    enabled: !!tenant?.id,
  });

  // Assign addon to tenant
  const assignAddon = useMutation({
    mutationFn: async () => {
      if (!selectedAddon) return;

      const { data, error } = await supabase
        .from('platform_addon_purchases')
        .insert({
          tenant_id: tenant.id,
          addon_id: selectedAddon.id,
          quantity: quantity,
          amount_paid: 0, // Super admin can assign for free
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Addon assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-purchases', tenant.id] });
      setDialogOpen(false);
      setSelectedAddon(null);
      setQuantity(1);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign addon');
    }
  });

  // Toggle addon status
  const toggleAddonStatus = useMutation({
    mutationFn: async ({ purchaseId, newStatus }: { purchaseId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('platform_addon_purchases')
        .update({ status: newStatus })
        .eq('id', purchaseId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Addon status updated');
      queryClient.invalidateQueries({ queryKey: ['tenant-addon-purchases', tenant.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update addon status');
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Add-ons
            </CardTitle>
            <CardDescription>Additional features and services</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign Addon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Addon</DialogTitle>
                <DialogDescription>
                  Select an addon to assign to this tenant
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Addon</Label>
                  <div className="space-y-2">
                    {addons?.map((addon) => (
                      <div
                        key={addon.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddon?.id === addon.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedAddon(addon)}
                      >
                        <p className="font-medium">{addon.title}</p>
                        <p className="text-sm text-muted-foreground">{addon.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedAddon && selectedAddon.addon_type === 'sms_credits' && (
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (Credits)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                    />
                  </div>
                )}

                <Button
                  onClick={() => assignAddon.mutate()}
                  disabled={!selectedAddon || assignAddon.isPending}
                  className="w-full"
                >
                  {assignAddon.isPending ? 'Assigning...' : 'Assign Addon'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!purchases || purchases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No addons assigned yet
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase: any) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{purchase.addon?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {purchase.addon?.description}
                  </p>
                  {purchase.addon?.addon_type === 'sms_credits' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Quantity: {purchase.quantity} credits
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={purchase.status === 'active' ? 'default' : 'secondary'}>
                    {purchase.status}
                  </Badge>
                  <Switch
                    checked={purchase.status === 'active'}
                    onCheckedChange={(checked) =>
                      toggleAddonStatus.mutate({
                        purchaseId: purchase.id,
                        newStatus: checked ? 'active' : 'inactive'
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
