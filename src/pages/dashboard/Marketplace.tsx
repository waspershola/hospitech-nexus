import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, History, CreditCard, CheckCircle2 } from 'lucide-react';
import { usePlatformAddons } from '@/hooks/usePlatformAddons';
import { AddonPurchaseDialog } from '@/components/marketplace/AddonPurchaseDialog';
import { useTenantSMSCredits } from '@/hooks/useTenantSMSCredits';
import { Skeleton } from '@/components/ui/skeleton';

export default function Marketplace() {
  const { addons, isLoading: addonsLoading } = usePlatformAddons();
  const { credits, purchases, isLoading: creditsLoading } = useTenantSMSCredits();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<any>(null);

  const activeAddons = addons?.filter(addon => {
    const isActive = (addon as any).is_active !== false;
    return isActive;
  }) || [];

  const handlePurchase = (addon: any) => {
    const pricing = addon.pricing as any;
    setSelectedAddon({
      id: addon.id,
      name: addon.title,
      description: addon.description,
      price: pricing?.amount || 0,
      currency: pricing?.currency || 'NGN',
    });
    setPurchaseDialogOpen(true);
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (addonsLoading || creditsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Purchase SMS bundles and manage your credits</p>
      </div>

      {/* Credits Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {credits?.credits_available?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">SMS credits ready to use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Credits</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {credits?.credits_used?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total SMS sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {credits?.total_purchased?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime purchases</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bundles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bundles">
            <ShoppingCart className="h-4 w-4 mr-2" />
            SMS Bundles
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Purchase History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bundles" className="space-y-4">
          {activeAddons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No SMS bundles available at the moment</p>
                <p className="text-sm text-muted-foreground">Check back later for available packages</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeAddons.map((addon) => {
                const pricing = addon.pricing as any;
                const isPopular = addon.units_available >= 1000 && addon.units_available <= 5000;
                
                return (
                  <Card key={addon.id} className={isPopular ? 'border-primary' : ''}>
                    {isPopular && (
                      <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 text-center">
                        POPULAR
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {addon.title}
                      </CardTitle>
                      <CardDescription>{addon.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-3xl font-bold">{addon.units_available.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">SMS Credits</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {formatCurrency(pricing?.amount || 0, pricing?.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {((pricing?.amount || 0) / addon.units_available).toFixed(2)} per SMS
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => handlePurchase(addon)}
                        size="lg"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase Bundle
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {!purchases || purchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No purchase history yet</p>
                <p className="text-sm text-muted-foreground">Your purchases will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase: any) => {
                const addon = purchase.addon as any;
                const pricing = addon?.pricing as any;

                return (
                  <Card key={purchase.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{addon?.title || 'SMS Bundle'}</h4>
                            <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                              {purchase.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addon?.units_available?.toLocaleString() || 0} SMS credits
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Purchased on {new Date(purchase.purchased_at).toLocaleDateString()} at{' '}
                            {new Date(purchase.purchased_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(purchase.amount_paid || 0, pricing?.currency)}
                          </div>
                          {purchase.status === 'completed' && (
                            <Badge variant="outline" className="mt-1">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Credited
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddonPurchaseDialog
        addon={selectedAddon}
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
      />
    </div>
  );
}
