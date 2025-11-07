import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Save, RotateCcw, DollarSign, FileText, Lock, Clock, Mail, Database, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { DocumentsTab } from '@/components/configuration/tabs/DocumentsTab';
import { CheckoutPolicyTab } from '@/components/configuration/tabs/CheckoutPolicyTab';
import { AuditLogsTab } from '@/components/configuration/tabs/AuditLogsTab';
import { EmailSettingsTab } from '@/components/configuration/tabs/EmailSettingsTab';
import { MaintenanceTab } from '@/components/configuration/tabs/MaintenanceTab';
import { FinancialOverviewTab } from '@/components/configuration/tabs/FinancialOverviewTab';
import { SMSSettingsTab } from '@/components/configuration/tabs/SMSSettingsTab';
import { useConfigCompleteness } from '@/hooks/useConfigCompleteness';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const tabs = [
  { id: 'finance-overview', label: 'Finance Overview', icon: DollarSign },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'checkout', label: 'Checkout Policy', icon: Clock },
  { id: 'audit', label: 'Audit Logs', icon: Clock },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'sms', label: 'SMS Notifications', icon: MessageSquare },
  { id: 'maintenance', label: 'Maintenance', icon: Database },
];

export default function ConfigurationCenter() {
  const { tenantId, role } = useAuth();
  const loadAllConfig = useConfigStore(state => state.loadAllConfig);
  const saveAllChanges = useConfigStore(state => state.saveAllChanges);
  const resetChanges = useConfigStore(state => state.resetChanges);
  const unsavedCount = useConfigStore(state => state.unsavedChanges.length);
  const isSaving = useConfigStore(state => state.isSaving);
  const savingProgress = useConfigStore(state => state.savingProgress);
  const lastSyncTime = useConfigStore(state => state.lastSyncTime);
  const isLoading = useConfigStore(state => state.isLoading);
  const [activeTab, setActiveTab] = useState('finance-overview');
  const { percentage, checks, isComplete } = useConfigCompleteness();

  useEffect(() => {
    if (tenantId) {
      loadAllConfig(tenantId);
    }
  }, [tenantId, loadAllConfig]);

  const handleSaveAll = async () => {
    try {
      await saveAllChanges();
    } catch (error) {
      console.error('Save all failed:', error);
      // Error handling is done in the store
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
            <div className="flex-1">
              <h1 className="text-3xl font-display font-semibold text-foreground">
                Configuration Center
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage operational settings, finances, documents, and integrations
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

              {lastSyncTime && unsavedCount === 0 && !isSaving && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span>Last saved: {lastSyncTime.toLocaleTimeString()}</span>
                </div>
              )}

              {isSaving && savingProgress.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <Loader2 className="h-3 w-3 text-primary animate-spin" />
                  <span className="text-sm font-medium text-primary">
                    Saving {savingProgress.filter(p => p.status === 'saving').length} of {savingProgress.length}...
                  </span>
                </div>
              )}

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
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="max-w-7xl mx-auto px-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            For identity and branding settings, visit the{' '}
            <a href="/dashboard/domain-config" className="font-medium underline">
              Domain Configuration
            </a>
            .
          </AlertDescription>
        </Alert>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 h-auto p-2 bg-muted/50 overflow-x-auto">{}
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
      </div>
    </div>
  );
}
