import { WiFiManagementTab } from '@/components/configuration/tabs/WiFiManagementTab';

export default function WiFiManager() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">WiFi Manager</h1>
        <p className="text-muted-foreground mt-1">
          Manage WiFi credentials for guest access
        </p>
      </div>
      
      <WiFiManagementTab />
    </div>
  );
}
