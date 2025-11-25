import { useSearchParams } from "react-router-dom";
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
import { PostCheckoutLedgerTab } from '@/modules/finance-center/PostCheckoutLedgerTab';
import { FinanceReportsTab } from '@/modules/finance-center/FinanceReportsTab';
import { FinanceAuditTab } from '@/modules/finance-center/FinanceAuditTab';
import { PaymentMethodsTab } from '@/modules/finance-center/PaymentMethodsTab';
import { BackfillFoliosButton } from '@/components/admin/BackfillFoliosButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PlatformFeesTab } from '@/components/finance/PlatformFeesTab';
import { Wallet, Building2, TrendingUp, Building, RefreshCcw, MapPin, Shield, BarChart3, Settings, Receipt, CreditCard, Sliders, FileText, Printer, DollarSign } from 'lucide-react';

export default function FinanceCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'settings';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };
  
  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            {activeTab === 'settings' && 'Finance Settings'}
            {activeTab === 'preferences' && 'Payment Preferences'}
            {activeTab === 'receipts' && 'Receipt Settings'}
            {activeTab === 'receipt-logs' && 'Receipt Logs'}
            {activeTab === 'receivables' && 'Accounts Receivable'}
            {activeTab === 'credits' && 'Guest Credits'}
            {activeTab === 'folios' && 'Folios'}
            {activeTab === 'post-checkout' && 'Post-Checkout Ledger'}
            {activeTab === 'reports' && 'Finance Reports'}
            {activeTab === 'organizations' && 'Organizations'}
            {activeTab === 'providers' && 'Payment Providers'}
            {activeTab === 'payment-methods' && 'Payment Methods'}
            {activeTab === 'locations' && 'Payment Locations'}
            {activeTab === 'rules' && 'Provider Rules'}
            {activeTab === 'wallets' && 'Guest Wallets'}
            {activeTab === 'reconciliation' && 'Reconciliation'}
            {activeTab === 'org-analytics' && 'Organization Analytics'}
            {activeTab === 'analytics' && 'Financial Analytics'}
            {activeTab === 'platform-fees' && 'Platform Fees'}
            {activeTab === 'audit' && 'Audit Trail'}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === 'settings' && 'Configure currency, tax rates, and service charges'}
            {activeTab === 'preferences' && 'Configure payment processing preferences'}
            {activeTab === 'receipts' && 'Customize receipt templates and settings'}
            {activeTab === 'receipt-logs' && 'View receipt generation history'}
            {activeTab === 'receivables' && 'Manage accounts receivable and outstanding balances'}
            {activeTab === 'credits' && 'View and manage guest credit balances'}
            {activeTab === 'folios' && 'View and manage guest folios'}
            {activeTab === 'post-checkout' && 'Review closed folio transactions'}
            {activeTab === 'reports' && 'Financial reports and summaries'}
            {activeTab === 'organizations' && 'Manage corporate and group accounts'}
            {activeTab === 'providers' && 'Manage payment providers and integrations'}
            {activeTab === 'payment-methods' && 'Configure accepted payment methods'}
            {activeTab === 'locations' && 'Manage payment collection locations'}
            {activeTab === 'rules' && 'Configure provider-specific rules'}
            {activeTab === 'wallets' && 'Monitor guest wallet transactions and balances'}
            {activeTab === 'reconciliation' && 'Reconcile transactions with providers'}
            {activeTab === 'org-analytics' && 'Analytics for organizations and corporate clients'}
            {activeTab === 'analytics' && 'Financial insights and performance metrics'}
            {activeTab === 'platform-fees' && 'View platform fee charges and billing'}
            {activeTab === 'audit' && 'Complete audit trail of financial changes'}
          </p>
        </div>
        <BackfillFoliosButton />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">

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

          <TabsContent value="post-checkout" className="mt-0">
            <PostCheckoutLedgerTab />
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <FinanceReportsTab />
          </TabsContent>

          <TabsContent value="organizations" className="mt-0">
            <OrganizationsTab />
          </TabsContent>

          <TabsContent value="providers" className="mt-0">
            <ProvidersTab />
          </TabsContent>

          <TabsContent value="payment-methods" className="mt-0">
            <PaymentMethodsTab />
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

          <TabsContent value="audit" className="mt-0">
            <FinanceAuditTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
}
