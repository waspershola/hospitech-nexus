import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Pencil, Trash2 } from 'lucide-react';
import { usePlatformAddons } from '@/hooks/usePlatformAddons';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddonPurchaseDialog } from '@/components/marketplace/AddonPurchaseDialog';

const ADDON_TYPES = [
  { value: 'sms_credits', label: 'SMS Credits', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  { value: 'integration', label: 'Integration', color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  { value: 'service', label: 'Service', color: 'bg-green-500/10 text-green-700 border-green-200' },
  { value: 'customization', label: 'Customization', color: 'bg-orange-500/10 text-orange-700 border-orange-200' },
];

export function PlatformMarketplaceTab() {
  const { addons, purchases, isLoading, createAddon, updateAddon, deleteAddon } = usePlatformAddons();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState<string | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    addon_type: 'sms_credits',
    units_available: 0,
    amount: 0,
    currency: 'NGN',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const addonData: any = {
      key: formData.addon_type === 'sms_credits' 
        ? `sms_bundle_${formData.units_available}`
        : `${formData.addon_type}_${formData.name.toLowerCase().replace(/\s+/g, '_')}`,
      title: formData.name,
      description: formData.description,
      addon_type: formData.addon_type,
      pricing: {
        amount: formData.amount,
        currency: formData.currency,
      },
      metadata: {},
    };

    // Only add units_available for SMS credits
    if (formData.addon_type === 'sms_credits') {
      addonData.units_available = formData.units_available;
    }

    if (editingAddon) {
      await updateAddon.mutateAsync({
        id: editingAddon.id,
        updates: addonData,
      });
    } else {
      await createAddon.mutateAsync(addonData);
    }

    setIsDialogOpen(false);
    setEditingAddon(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      addon_type: 'sms_credits',
      units_available: 0,
      amount: 0,
      currency: 'NGN',
    });
  };

  const handleEdit = (addon: any) => {
    const pricing = addon.pricing as any;
    setEditingAddon(addon);
    setFormData({
      name: addon.title,
      description: addon.description || '',
      addon_type: addon.addon_type || 'sms_credits',
      units_available: addon.units_available || 0,
      amount: pricing?.amount || 0,
      currency: pricing?.currency || 'NGN',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (addonToDelete) {
      await deleteAddon.mutateAsync(addonToDelete);
      setDeleteDialogOpen(false);
      setAddonToDelete(null);
    }
  };

  const getAddonTypeBadge = (type: string) => {
    const addonType = ADDON_TYPES.find(t => t.value === type) || ADDON_TYPES[0];
    return (
      <Badge variant="outline" className={addonType.color}>
        {addonType.label}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Loading marketplace...</div>;
  }

  // Group addons by type
  const groupedAddons = addons?.reduce((acc: any, addon: any) => {
    const type = addon.addon_type || 'sms_credits';
    if (!acc[type]) acc[type] = [];
    acc[type].push(addon);
    return acc;
  }, {});

  return (
    <>
      <Tabs defaultValue="addons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="addons">Add-ons Catalog</TabsTrigger>
          <TabsTrigger value="purchases">Purchase History</TabsTrigger>
        </TabsList>

        <TabsContent value="addons" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Platform Add-ons</h2>
            <Dialog 
              open={isDialogOpen} 
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingAddon(null);
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Add-on
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingAddon ? 'Edit Add-on' : 'Create Add-on'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Add-on Type</Label>
                    <Select
                      value={formData.addon_type}
                      onValueChange={(value) => setFormData({ ...formData, addon_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADDON_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Booking.com Integration"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add-on description"
                    />
                  </div>

                  {formData.addon_type === 'sms_credits' && (
                    <div className="space-y-2">
                      <Label>SMS Credits</Label>
                      <Input
                        type="number"
                        value={formData.units_available}
                        onChange={(e) =>
                          setFormData({ ...formData, units_available: parseInt(e.target.value) })
                        }
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: parseFloat(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input value={formData.currency} disabled />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createAddon.isPending || updateAddon.isPending}>
                    {editingAddon ? 'Update Add-on' : 'Create Add-on'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Display addons grouped by type */}
          {Object.entries(groupedAddons || {}).map(([type, typeAddons]: [string, any]) => {
            const typeLabel = ADDON_TYPES.find(t => t.value === type)?.label || type;
            return (
              <div key={type} className="space-y-3">
                <h3 className="text-lg font-medium">{typeLabel}</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeAddons.map((addon: any) => {
                    const pricing = addon.pricing as any;
                    return (
                      <Card key={addon.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-base">{addon.title}</CardTitle>
                              <div className="mt-2">
                                {getAddonTypeBadge(addon.addon_type)}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(addon)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setAddonToDelete(addon.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">{addon.description}</p>
                          {addon.units_available && (
                            <div className="flex justify-between items-center">
                              <span className="text-2xl font-bold">{addon.units_available}</span>
                              <span className="text-sm text-muted-foreground">SMS Credits</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold">
                              {pricing?.currency} {pricing?.amount?.toLocaleString()}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAddon({
                                  id: addon.id,
                                  name: addon.title,
                                  description: addon.description,
                                  price: pricing?.amount || 0,
                                  currency: pricing?.currency || 'NGN',
                                });
                                setPurchaseDialogOpen(true);
                              }}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Purchase
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <h2 className="text-xl font-semibold">Purchase History</h2>
          <div className="space-y-2">
            {purchases?.map((purchase) => {
              const addon = purchase.addon as any;
              const pricing = addon?.pricing as any;

              return (
                <Card key={purchase.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Tenant: {purchase.tenant_id}</p>
                          {addon?.addon_type && getAddonTypeBadge(addon.addon_type)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {addon?.title}
                          {addon?.units_available && ` - ${addon.units_available} credits`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(purchase.purchased_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                          {purchase.status}
                        </Badge>
                        <p className="text-sm font-semibold mt-2">
                          {pricing?.currency} {purchase.amount_paid?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <AddonPurchaseDialog
        addon={selectedAddon}
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this add-on. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
