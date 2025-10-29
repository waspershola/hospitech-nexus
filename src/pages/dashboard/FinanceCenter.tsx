import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProvidersTab } from '@/modules/finance-center/ProvidersTab';
import { WalletsTab } from '@/modules/finance-center/WalletsTab';
import { Wallet, Building2, TrendingUp } from 'lucide-react';

export default function FinanceCenter() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Finance Center</h1>
        <p className="text-muted-foreground">Manage payments, providers, and wallets</p>
      </div>

      <Tabs defaultValue="providers" className="flex-1">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="wallets" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Wallets
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

        <TabsContent value="analytics">
          <div className="text-center py-12 text-muted-foreground">
            Analytics coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
