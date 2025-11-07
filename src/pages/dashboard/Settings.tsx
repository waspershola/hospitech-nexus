import { useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralTab } from "@/components/configuration/tabs/GeneralTab";
import { BrandingTab } from "@/components/configuration/tabs/BrandingTab";
import { PermissionsTab } from "@/components/configuration/tabs/PermissionsTab";
import { PortalPreviewCard } from "@/components/configuration/shared/PortalPreviewCard";
import { useAuth } from "@/contexts/AuthContext";
import { useConfigStore } from "@/stores/configStore";

export default function Settings() {
  const { tenantId } = useAuth();
  const setTenantId = useConfigStore(state => state.setTenantId);
  const loadAllConfig = useConfigStore(state => state.loadAllConfig);

  // Initialize tenant ID and load config when tenantId is available
  useEffect(() => {
    if (tenantId) {
      console.log('⚙️ [Settings] Initializing with tenant ID:', tenantId);
      setTenantId(tenantId);
      loadAllConfig(tenantId);
    }
  }, [tenantId, setTenantId, loadAllConfig]);
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hotel Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your hotel's identity, operations, and access controls
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="portal">Guest Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <BrandingTab />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <PermissionsTab />
        </TabsContent>

        <TabsContent value="portal" className="space-y-6">
          <PortalPreviewCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
