import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformProvidersTab } from './tabs/PlatformProvidersTab';
import { PlatformTenantsTab } from './tabs/PlatformTenantsTab';
import { PlatformMarketplaceTab } from './tabs/PlatformMarketplaceTab';
import { Server, Users, ShoppingCart } from 'lucide-react';

export default function PlatformDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Admin</h1>
        <p className="text-muted-foreground">
          Manage SMS providers, tenants, and marketplace
        </p>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers" className="gap-2">
            <Server className="h-4 w-4" />
            SMS Providers
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-2">
            <Users className="h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <PlatformProvidersTab />
        </TabsContent>

        <TabsContent value="tenants">
          <PlatformTenantsTab />
        </TabsContent>

        <TabsContent value="marketplace">
          <PlatformMarketplaceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
