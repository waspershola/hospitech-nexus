import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProvidersTab } from '@/modules/finance-center/ProvidersTab';
import { WalletsTab } from '@/modules/finance-center/WalletsTab';
import { OrganizationsTab } from '@/modules/finance-center/OrganizationsTab';
import { AnalyticsTab } from '@/modules/finance-center/AnalyticsTab';
import { ReconciliationTab } from '@/modules/finance-center/ReconciliationTab';
import { Wallet, Building2, TrendingUp, Building, RefreshCcw } from 'lucide-react';

export default function FinanceCenter() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Finance Center</h1>
        <p className="text-muted-foreground">Manage payments, providers, and wallets</p>
      </div>

      <Tabs defaultValue="providers" className="flex-1">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="wallets" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Wallets
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>

        <TabsContent value="wallets">
          <WalletsTab />
        </TabsContent>

        <TabsContent value="organizations">
          <OrganizationsTab />
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
