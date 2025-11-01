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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Wallet, Building2, TrendingUp, Building, RefreshCcw, MapPin, Shield, BarChart3, Settings, Receipt, CreditCard, Sliders, FileText, Printer } from 'lucide-react';

export default function FinanceCenter() {
  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Finance Center</h1>
        <p className="text-muted-foreground">Manage payments, providers, and wallets</p>
      </div>

      <Tabs defaultValue="settings" className="flex-1">
        <TabsList className="grid w-full grid-cols-13 mb-6">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Receipts</span>
          </TabsTrigger>
          <TabsTrigger value="receipt-logs" className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="receivables" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">A/R</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Credits</span>
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="wallets" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Wallets
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="org-analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Org Analytics
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <FinanceSettingsTab />
        </TabsContent>

        <TabsContent value="preferences">
          <PaymentPreferencesTab />
        </TabsContent>

        <TabsContent value="receipts">
          <ReceiptSettingsTab />
        </TabsContent>

        <TabsContent value="receipt-logs">
          <ReceiptLogsTab />
        </TabsContent>

        <TabsContent value="receivables">
          <ReceivablesTab />
        </TabsContent>

        <TabsContent value="credits">
          <WalletCreditsTab />
        </TabsContent>

        <TabsContent value="organizations">
          <OrganizationsTab />
        </TabsContent>

        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>

        <TabsContent value="locations">
          <LocationsTab />
        </TabsContent>

        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>

        <TabsContent value="wallets">
          <WalletsTab />
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationTab />
        </TabsContent>

        <TabsContent value="org-analytics">
          <OrganizationAnalyticsTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
      </div>
    </ErrorBoundary>
  );
}
