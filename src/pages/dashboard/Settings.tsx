import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, DollarSign, FileText, Clock, Mail, Database, MessageSquare, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { DocumentsTab } from '@/components/configuration/tabs/DocumentsTab';
import { CheckoutPolicyTab } from '@/components/configuration/tabs/CheckoutPolicyTab';
import { AuditLogsTab } from '@/components/configuration/tabs/AuditLogsTab';
import { EmailSettingsTab } from '@/components/configuration/tabs/EmailSettingsTab';
import { MaintenanceTab } from '@/components/configuration/tabs/MaintenanceTab';
import { FinancialOverviewTab } from '@/components/configuration/tabs/FinancialOverviewTab';
import { SMSSettingsTab } from '@/components/configuration/tabs/SMSSettingsTab';

const tabs = [
  { id: 'finance-overview', label: 'Finance Overview', icon: DollarSign },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'checkout', label: 'Checkout Policy', icon: Clock },
  { id: 'audit', label: 'Audit Logs', icon: Clock },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'sms', label: 'SMS Notifications', icon: MessageSquare },
  { id: 'maintenance', label: 'Maintenance', icon: Database },
];

export default function Settings() {
  const { tenantId, role } = useAuth();
  const setTenantId = useConfigStore(state => state.setTenantId);
  const loadAllConfig = useConfigStore(state => state.loadAllConfig);
  const resetChanges = useConfigStore(state => state.resetChanges);
  const unsavedCount = useConfigStore(state => state.unsavedChanges.length);
  const isSaving = useConfigStore(state => state.isSaving);
  const [activeTab, setActiveTab] = useState('finance-overview');

  useEffect(() => {
    if (tenantId) {
      setTenantId(tenantId);
      loadAllConfig(tenantId);
    }
  }, [tenantId, setTenantId, loadAllConfig]);

  const handleReset = () => {
    if (confirm('Are you sure you want to discard all unsaved changes?')) {
      resetChanges();
      toast.info('Changes discarded');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-display font-semibold text-foreground">
                Hotel Settings
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage operational settings, finances, documents, and integrations
              </p>
            </div>

            {(role === 'owner' || role === 'manager') && (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={unsavedCount === 0 || isSaving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {role === 'owner' || role === 'manager' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 h-auto p-2 bg-muted/50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex flex-col items-center gap-1 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="finance-overview" className="space-y-6 animate-fade-in">
              <FinancialOverviewTab />
            </TabsContent>

            <TabsContent value="documents" className="space-y-6 animate-fade-in">
              <DocumentsTab />
            </TabsContent>

            <TabsContent value="checkout" className="space-y-6 animate-fade-in">
              <CheckoutPolicyTab />
            </TabsContent>

            <TabsContent value="audit" className="space-y-6 animate-fade-in">
              <AuditLogsTab />
            </TabsContent>

            <TabsContent value="email" className="space-y-6 animate-fade-in">
              <EmailSettingsTab />
            </TabsContent>

            <TabsContent value="sms" className="space-y-6 animate-fade-in">
              <SMSSettingsTab />
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-6 animate-fade-in">
              <MaintenanceTab />
            </TabsContent>
          </Tabs>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Only owners and managers can access hotel-wide settings.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
