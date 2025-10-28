import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Save, RotateCcw, Settings, DollarSign, Percent, Palette, FileText, Users, Lock, Clock, Mail, Database, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { GeneralTab } from '@/components/configuration/tabs/GeneralTab';
import { FinancialsTab } from '@/components/configuration/tabs/FinancialsTab';
import { TaxServiceTab } from '@/components/configuration/tabs/TaxServiceTab';
import { BrandingTab } from '@/components/configuration/tabs/BrandingTab';
import { DocumentsTab } from '@/components/configuration/tabs/DocumentsTab';
import { GuestExperienceTab } from '@/components/configuration/tabs/GuestExperienceTab';
import { PermissionsTab } from '@/components/configuration/tabs/PermissionsTab';
import { AuditLogsTab } from '@/components/configuration/tabs/AuditLogsTab';
import { EmailSettingsTab } from '@/components/configuration/tabs/EmailSettingsTab';
import { MaintenanceTab } from '@/components/configuration/tabs/MaintenanceTab';
import { DomainsTab } from '@/components/configuration/tabs/DomainsTab';

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'tax', label: 'Tax & Service', icon: Percent },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'guest', label: 'Guest Experience', icon: Users },
  { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'permissions', label: 'Permissions', icon: Lock },
  { id: 'audit', label: 'Audit Logs', icon: Clock },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'maintenance', label: 'Maintenance', icon: Database },
];

export default function ConfigurationCenter() {
  const { tenantId, role } = useAuth();
  const { loadAllConfig, saveAllChanges, resetChanges, unsavedChanges, lastSyncTime, isLoading } = useConfigStore();
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (tenantId) {
      loadAllConfig(tenantId);
    }
  }, [tenantId, loadAllConfig]);

  const handleSaveAll = async () => {
    try {
      await saveAllChanges();
      toast.success('All changes saved successfully');
    } catch (error) {
      toast.error('Failed to save changes');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to discard all unsaved changes?')) {
      resetChanges();
      toast.info('Changes discarded');
    }
  };

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
            <div>
              <h1 className="text-3xl font-display font-semibold text-foreground">
                Configuration Center
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage hotel-wide identity, policy, and service standards
              </p>
            </div>

            <div className="flex items-center gap-4">
              {unsavedChanges.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {unsavedChanges.size} unsaved change{unsavedChanges.size !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {lastSyncTime && (
                <span className="text-xs text-muted-foreground">
                  Last synced: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={unsavedChanges.size === 0 || isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={unsavedChanges.size === 0 || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-11 gap-2 h-auto p-2 bg-muted/50">
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

          <TabsContent value="general" className="space-y-6 animate-fade-in">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="financials" className="space-y-6 animate-fade-in">
            <FinancialsTab />
          </TabsContent>

          <TabsContent value="tax" className="space-y-6 animate-fade-in">
            <TaxServiceTab />
          </TabsContent>

          <TabsContent value="branding" className="space-y-6 animate-fade-in">
            <BrandingTab />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 animate-fade-in">
            <DocumentsTab />
          </TabsContent>

          <TabsContent value="guest" className="space-y-6 animate-fade-in">
            <GuestExperienceTab />
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

          <TabsContent value="maintenance" className="space-y-6 animate-fade-in">
            <MaintenanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
