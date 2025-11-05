import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart } from 'lucide-react';
import { usePlatformAddons } from '@/hooks/usePlatformAddons';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddonPurchaseDialog } from '@/components/marketplace/AddonPurchaseDialog';

export function PlatformMarketplaceTab() {
  const { addons, purchases, isLoading, createAddon } = usePlatformAddons();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    units_available: 0,
    amount: 0,
    currency: 'NGN',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAddon.mutateAsync({
      key: `sms_bundle_${formData.units_available}`,
      title: formData.name,
      description: formData.description,
      units_available: formData.units_available,
      pricing: {
        amount: formData.amount,
        currency: formData.currency,
      },
    });

    setIsDialogOpen(false);
    setFormData({
      name: '',
      description: '',
      units_available: 0,
      amount: 0,
      currency: 'NGN',
      is_active: true,
    });
  };

  if (isLoading) {
    return <div>Loading marketplace...</div>;
  }

  return (
    <>
    <Tabs defaultValue="addons" className="space-y-4">
      <TabsList>
        <TabsTrigger value="addons">Add-ons Catalog</TabsTrigger>
        <TabsTrigger value="purchases">Purchase History</TabsTrigger>
      </TabsList>

      <TabsContent value="addons" className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">SMS Bundles</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Bundle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create SMS Bundle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bundle Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Starter Pack - 500 SMS"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Bundle description"
                  />
                </div>

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
                  Create Bundle
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addons?.map((addon) => {
            const pricing = addon.pricing as any;
            return (
              <Card key={addon.id}>
                <CardHeader>
                  <CardTitle>
                    {addon.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{addon.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{addon.units_available}</span>
                    <span className="text-sm text-muted-foreground">SMS Credits</span>
                  </div>
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
                      <p className="font-medium">Tenant: {purchase.tenant_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {addon?.title} - {addon?.units_available} credits
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
    </>
  );
}
