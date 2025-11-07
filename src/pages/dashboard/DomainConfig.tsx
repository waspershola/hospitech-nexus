import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Settings2, 
  Palette, 
  Building2, 
  Globe, 
  Users, 
  Lock,
  RotateCcw
} from 'lucide-react';
import { GeneralTab } from '@/components/configuration/tabs/GeneralTab';
import { BrandingTab } from '@/components/configuration/tabs/BrandingTab';
import { MetaTab } from '@/components/configuration/tabs/MetaTab';
import { DomainsTab } from '@/components/configuration/tabs/DomainsTab';
import { GuestExperienceTab } from '@/components/configuration/tabs/GuestExperienceTab';
import { PermissionsTab } from '@/components/configuration/tabs/PermissionsTab';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const tabs = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'branding', label: 'Branding & Theme', icon: Palette },
  { id: 'meta', label: 'Hotel Profile', icon: Building2 },
  { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'guest', label: 'Guest Experience', icon: Users },
  { id: 'permissions', label: 'Permissions', icon: Lock },
];

export default function DomainConfig() {
  const { tenantId, role } = useAuth();
  const setTenantId = useConfigStore(state => state.setTenantId);
  const loadAllConfig = useConfigStore(state => state.loadAllConfig);
  const saveAllChanges = useConfigStore(state => state.saveAllChanges);
  const resetChanges = useConfigStore(state => state.resetChanges);
  const unsavedCount = useConfigStore(state => state.unsavedChanges.length);
  const isSaving = useConfigStore(state => state.isSaving);
  const savingProgress = useConfigStore(state => state.savingProgress);
  const lastSyncTime = useConfigStore(state => state.lastSyncTime);
  const isLoading = useConfigStore(state => state.isLoading);
  
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (tenantId) {
      setTenantId(tenantId);
      loadAllConfig(tenantId);
    }
  }, [tenantId, setTenantId, loadAllConfig]);

  const handleSaveAll = async () => {
    await saveAllChanges();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to discard all unsaved changes?')) {
      resetChanges();
    }
  };

  // Restrict access to owner and manager only
  if (role !== 'owner' && role !== 'manager') {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-display text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only owners and managers can access domain configuration settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-foreground mb-2">Domain Configuration</h1>
            <p className="text-muted-foreground">
              Manage your hotel's identity, branding, and guest experience
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={unsavedCount === 0 || isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          For operational settings like finances, documents, and email configuration, visit the{' '}
          <a href="/dashboard/configuration-center" className="font-medium underline">
            Configuration Center
          </a>
          .
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 h-auto p-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-3 py-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6 mt-6">
          <BrandingTab />
        </TabsContent>

        <TabsContent value="meta" className="space-y-6 mt-6">
          <MetaTab />
        </TabsContent>

        <TabsContent value="domains" className="space-y-6 mt-6">
          <DomainsTab />
        </TabsContent>

        <TabsContent value="guest" className="space-y-6 mt-6">
          <GuestExperienceTab />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6 mt-6">
          <PermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
