import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Settings, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useWallets } from '@/hooks/useWallets';
import { LocationDrawer } from './LocationDrawer';
import { LocationSkeleton } from '@/components/ui/skeleton-loaders';

export function LocationsTab() {
  const { locations, isLoading } = useFinanceLocations();
  const { providers } = useFinanceProviders();
  const { wallets } = useWallets();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleAddLocation = () => {
    setSelectedLocation(null);
    setDrawerOpen(true);
  };

  const handleEditLocation = (id: string) => {
    setSelectedLocation(id);
    setDrawerOpen(true);
  };

  const getProviderName = (providerId: string | null) => {
    if (!providerId) return 'None';
    return providers.find(p => p.id === providerId)?.name || 'Unknown';
  };

  const getWalletName = (walletId: string | null) => {
    if (!walletId) return 'None';
    const wallet = wallets.find(w => w.id === walletId);
    return wallet?.name || wallet?.department || 'Unknown';
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-semibold">Payment Locations</h2>
          <p className="text-muted-foreground">Configure payment collection points across your property</p>
        </div>
        <Button onClick={handleAddLocation} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LocationSkeleton />
          <LocationSkeleton />
          <LocationSkeleton />
        </div>
      ) : locations.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No locations configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start by adding your first payment location to manage transactions across departments
            </p>
            <Button onClick={handleAddLocation}>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Card key={location.id} className="rounded-2xl shadow-card hover:shadow-luxury transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      {location.department && (
                        <CardDescription>{location.department}</CardDescription>
                      )}
                    </div>
                  </div>
                  {location.status === 'active' ? (
                    <Badge variant="default" className="bg-semantic-success">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="w-3 h-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">{getProviderName(location.provider_id)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      Wallet
                    </span>
                    <span className="font-medium">{getWalletName(location.wallet_id)}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleEditLocation(location.id)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LocationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locationId={selectedLocation}
      />
    </div>
  );
}
