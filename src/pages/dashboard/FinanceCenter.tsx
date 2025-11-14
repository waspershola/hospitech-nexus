import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceSettingsTab } from '@/modules/finance-center/FinanceSettingsTab';
import { PaymentPreferencesTab } from '@/modules/finance-center/PaymentPreferencesTab';
import { ProvidersTab } from '@/modules/finance-center/ProvidersTab';
import { LocationsTab } from '@/modules/finance-center/LocationsTab';
import { RulesTab } from '@/modules/finance-center/RulesTab';
import { WalletsTab } from '@/modules/finance-center/WalletsTab';
import { OrganizationsTab } from '@/modules/finance-center/OrganizationsTab';
import { OrganizationAnalyticsTab } from '@/modules/finance-center/OrganizationAnalyticsTab';
import { AnalyticsTab } from '@/modules/finance-center/AnalyticsTab';
import { ReconciliationTab } from '@/modules/finance-center/ReconciliationTab';
import { ReceivablesTab } from '@/modules/finance-center/ReceivablesTab';
import { WalletCreditsTab } from '@/modules/finance-center/WalletCreditsTab';
import { ReceiptSettingsTab } from '@/modules/finance-center/ReceiptSettingsTab';
import { ReceiptLogsTab } from '@/modules/finance-center/ReceiptLogsTab';
import { FoliosTab } from '@/modules/finance-center/FoliosTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PlatformFeesTab } from '@/components/finance/PlatformFeesTab';
import { Wallet, Building2, TrendingUp, Building, RefreshCcw, MapPin, Shield, BarChart3, Settings, Receipt, CreditCard, Sliders, FileText, Printer, DollarSign } from 'lucide-react';

export default function FinanceCenter() {
  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Finance Center</h1>
        <p className="text-muted-foreground">Manage payments, providers, and wallets</p>
      </div>

      <Tabs defaultValue="settings" className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto pb-2 -mx-6 px-6">
          <TabsList className="inline-flex w-auto h-auto mb-4 gap-1 flex-nowrap">
            <TabsTrigger value="settings" className="flex items-center gap-2 whitespace-nowrap">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2 whitespace-nowrap">
              <Sliders className="w-4 h-4" />
              <span>Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="w-4 h-4" />
              <span>Receipts</span>
            </TabsTrigger>
            <TabsTrigger value="receipt-logs" className="flex items-center gap-2 whitespace-nowrap">
              <Printer className="w-4 h-4" />
              <span>Logs</span>
            </TabsTrigger>
            <TabsTrigger value="receivables" className="flex items-center gap-2 whitespace-nowrap">
              <Receipt className="w-4 h-4" />
              <span>A/R</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2 whitespace-nowrap">
              <CreditCard className="w-4 h-4" />
              <span>Credits</span>
            </TabsTrigger>
            <TabsTrigger value="folios" className="flex items-center gap-2 whitespace-nowrap">
              <Receipt className="w-4 h-4" />
              <span>Folios</span>
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2 whitespace-nowrap">
              <Building className="w-4 h-4" />
              <span>Organizations</span>
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2 whitespace-nowrap">
              <Building2 className="w-4 h-4" />
              <span>Providers</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2 whitespace-nowrap">
              <MapPin className="w-4 h-4" />
              <span>Locations</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2 whitespace-nowrap">
              <Shield className="w-4 h-4" />
              <span>Rules</span>
            </TabsTrigger>
            <TabsTrigger value="wallets" className="flex items-center gap-2 whitespace-nowrap">
              <Wallet className="w-4 h-4" />
              <span>Wallets</span>
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex items-center gap-2 whitespace-nowrap">
              <RefreshCcw className="w-4 h-4" />
              <span>Reconciliation</span>
            </TabsTrigger>
            <TabsTrigger value="org-analytics" className="flex items-center gap-2 whitespace-nowrap">
              <BarChart3 className="w-4 h-4" />
              <span>Org Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="platform-fees" className="flex items-center gap-2 whitespace-nowrap">
              <DollarSign className="w-4 h-4" />
              <span>Platform Fees</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <TabsContent value="settings" className="mt-0">
            <FinanceSettingsTab />
          </TabsContent>

          <TabsContent value="preferences" className="mt-0">
            <PaymentPreferencesTab />
          </TabsContent>

          <TabsContent value="receipts" className="mt-0">
            <ReceiptSettingsTab />
          </TabsContent>

          <TabsContent value="receipt-logs" className="mt-0">
            <ReceiptLogsTab />
          </TabsContent>

          <TabsContent value="receivables" className="mt-0">
            <ReceivablesTab />
          </TabsContent>

          <TabsContent value="credits" className="mt-0">
            <WalletCreditsTab />
          </TabsContent>

          <TabsContent value="folios" className="mt-0">
            <FoliosTab />
          </TabsContent>

          <TabsContent value="organizations" className="mt-0">
            <OrganizationsTab />
          </TabsContent>

          <TabsContent value="providers" className="mt-0">
            <ProvidersTab />
          </TabsContent>

          <TabsContent value="locations" className="mt-0">
            <LocationsTab />
          </TabsContent>

          <TabsContent value="rules" className="mt-0">
            <RulesTab />
          </TabsContent>

          <TabsContent value="wallets" className="mt-0">
            <WalletsTab />
          </TabsContent>

          <TabsContent value="reconciliation" className="mt-0">
            <ReconciliationTab />
          </TabsContent>

          <TabsContent value="org-analytics" className="mt-0">
            <OrganizationAnalyticsTab />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="platform-fees" className="mt-0">
            <PlatformFeesTab />
          </TabsContent>
        </div>
      </Tabs>
      </div>
    </ErrorBoundary>
  );
}
