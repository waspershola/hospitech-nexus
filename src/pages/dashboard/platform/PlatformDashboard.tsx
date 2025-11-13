import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { PlatformProvidersTab } from './tabs/PlatformProvidersTab';
import { PlatformTenantsTab } from './tabs/PlatformTenantsTab';
import { PlatformMarketplaceTab } from './tabs/PlatformMarketplaceTab';
import { PlatformPlansTab } from './tabs/PlatformPlansTab';
import { PlatformUsersTab } from './tabs/PlatformUsersTab';
import { PlatformSupportTab } from './tabs/PlatformSupportTab';
import { PlatformEmailProvidersTab } from './tabs/PlatformEmailProvidersTab';
import { PlatformPaymentProvidersTab } from './tabs/PlatformPaymentProvidersTab';
import { PlatformFeatureFlagsTab } from './tabs/PlatformFeatureFlagsTab';
import { PlatformBillingTab } from './tabs/PlatformBillingTab';
import { PlatformDatabaseCleanupTab } from './tabs/PlatformDatabaseCleanupTab';
import DeletedTenantsView from '@/components/platform/DeletedTenantsView';
import { PlatformSMSManagementTab } from './tabs/PlatformSMSManagementTab';
import { PlatformFeeDisputesTab } from '@/components/platform/PlatformFeeDisputesTab';
import { Server, Users, ShoppingCart, CreditCard, Shield, MessageSquare, Mail, Flag, Receipt, Trash2, Database, Activity, AlertTriangle } from 'lucide-react';

export default function PlatformDashboard() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'users';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Admin</h1>
        <p className="text-muted-foreground">
          Manage providers, tenants, plans, and marketplace
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Shield className="h-4 w-4" />
            Platform Users
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-2">
            <Users className="h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Deleted
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Server className="h-4 w-4" />
            SMS Providers
          </TabsTrigger>
          <TabsTrigger value="sms-management" className="gap-2">
            <Activity className="h-4 w-4" />
            SMS Management
          </TabsTrigger>
          <TabsTrigger value="email-providers" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Providers
          </TabsTrigger>
          <TabsTrigger value="payment-providers" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Providers
          </TabsTrigger>
          <TabsTrigger value="feature-flags" className="gap-2">
            <Flag className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <Receipt className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="disputes" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Fee Disputes
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="gap-2">
            <Database className="h-4 w-4" />
            DB Cleanup
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <PlatformUsersTab />
        </TabsContent>

        <TabsContent value="support">
          <PlatformSupportTab />
        </TabsContent>

        <TabsContent value="tenants">
          <PlatformTenantsTab />
        </TabsContent>

        <TabsContent value="deleted">
          <DeletedTenantsView />
        </TabsContent>

        <TabsContent value="plans">
          <PlatformPlansTab />
        </TabsContent>

        <TabsContent value="providers">
          <PlatformProvidersTab />
        </TabsContent>

        <TabsContent value="sms-management">
          <PlatformSMSManagementTab />
        </TabsContent>

        <TabsContent value="email-providers">
          <PlatformEmailProvidersTab />
        </TabsContent>

        <TabsContent value="payment-providers">
          <PlatformPaymentProvidersTab />
        </TabsContent>

        <TabsContent value="feature-flags">
          <PlatformFeatureFlagsTab />
        </TabsContent>

        <TabsContent value="billing">
          <PlatformBillingTab />
        </TabsContent>

        <TabsContent value="disputes">
          <PlatformFeeDisputesTab />
        </TabsContent>

        <TabsContent value="cleanup">
          <PlatformDatabaseCleanupTab />
        </TabsContent>

        <TabsContent value="marketplace">
          <PlatformMarketplaceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
