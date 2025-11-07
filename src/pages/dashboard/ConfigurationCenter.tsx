import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Settings, DollarSign, Palette, FileText, Users, Lock, Clock, Mail, Database, Globe, Building2, MessageSquare } from 'lucide-react';
import { ConfigurationStatus } from '@/components/configuration/shared/ConfigurationStatus';
import { GeneralTab } from '@/components/configuration/tabs/GeneralTab';
import { BrandingTab } from '@/components/configuration/tabs/BrandingTab';
import { MetaTab } from '@/components/configuration/tabs/MetaTab';
import { DocumentsTab } from '@/components/configuration/tabs/DocumentsTab';
import { GuestExperienceTab } from '@/components/configuration/tabs/GuestExperienceTab';
import { CheckoutPolicyTab } from '@/components/configuration/tabs/CheckoutPolicyTab';
import { PermissionsTab } from '@/components/configuration/tabs/PermissionsTab';
import { AuditLogsTab } from '@/components/configuration/tabs/AuditLogsTab';
import { EmailSettingsTab } from '@/components/configuration/tabs/EmailSettingsTab';
import { MaintenanceTab } from '@/components/configuration/tabs/MaintenanceTab';
import { DomainsTab } from '@/components/configuration/tabs/DomainsTab';
import { FinancialOverviewTab } from '@/components/configuration/tabs/FinancialOverviewTab';
import { SMSSettingsTab } from '@/components/configuration/tabs/SMSSettingsTab';
import { useConfigCompleteness } from '@/hooks/useConfigCompleteness';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'finance-overview', label: 'Finance Overview', icon: DollarSign },
  { id: 'branding', label: 'Branding & Theme', icon: Palette },
  { id: 'meta', label: 'Hotel Profile', icon: Building2 },
  { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'guest', label: 'Guest Experience', icon: Users },
  { id: 'checkout', label: 'Checkout Policy', icon: Clock },
  { id: 'permissions', label: 'Permissions', icon: Lock },
  { id: 'audit', label: 'Audit Logs', icon: Clock },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'sms', label: 'SMS Notifications', icon: MessageSquare },
  { id: 'maintenance', label: 'Maintenance', icon: Database },
];

export default function ConfigurationCenter() {
  const { tenantId, role } = useAuth();
  const setTenantId = useConfigStore(state => state.setTenantId);
  const loadAllConfig = useConfigStore(state => state.loadAllConfig);
  const unsavedCount = useConfigStore(state => state.unsavedChanges.length);
  const lastSyncTime = useConfigStore(state => state.lastSyncTime);
  const isLoading = useConfigStore(state => state.isLoading);
  const [activeTab, setActiveTab] = useState('general');
  const { percentage, checks, isComplete } = useConfigCompleteness();

  useEffect(() => {
    if (tenantId) {
      console.log('🏢 Initializing Configuration Center with tenant:', tenantId);
      setTenantId(tenantId);
      loadAllConfig(tenantId);
    }
  }, [tenantId, setTenantId, loadAllConfig]);


  if (role !== 'owner' && role !== 'manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-display font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only owners and managers can access the Configuration Center.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-display font-semibold text-foreground">
                Configuration Center
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage hotel-wide identity, policy, and service standards
              </p>
              
              {/* Setup Completeness Meter */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Progress value={percentage} className="h-2 flex-1 max-w-xs" />
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {percentage}% Setup
                      </Badge>
                    )}
                  </div>
                </div>
                {!isComplete && (
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {!checks.branding && <span>• Branding</span>}
                    {!checks.email && <span>• Email</span>}
                    {!checks.meta && <span>• Hotel Profile</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {unsavedCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-warning">
                    {unsavedCount} unsaved change{unsavedCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {lastSyncTime && unsavedCount === 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span>Last saved: {lastSyncTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-2 h-auto p-2 bg-muted/50 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-1 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all min-w-[100px]"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline truncate">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="general" className="space-y-6 animate-fade-in">
            <ConfigurationStatus />
            <GeneralTab />
          </TabsContent>

          <TabsContent value="finance-overview" className="space-y-6 animate-fade-in">
            <FinancialOverviewTab />
          </TabsContent>

          <TabsContent value="branding" className="space-y-6 animate-fade-in">
            <BrandingTab />
          </TabsContent>

          <TabsContent value="meta" className="space-y-6 animate-fade-in">
            <MetaTab />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 animate-fade-in">
            <DocumentsTab />
          </TabsContent>

          <TabsContent value="guest" className="space-y-6 animate-fade-in">
            <GuestExperienceTab />
          </TabsContent>

          <TabsContent value="checkout" className="space-y-6 animate-fade-in">
            <CheckoutPolicyTab />
          </TabsContent>

          <TabsContent value="domains" className="space-y-6 animate-fade-in">
            <DomainsTab />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6 animate-fade-in">
            <PermissionsTab />
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
      </div>
    </div>
  );
}
