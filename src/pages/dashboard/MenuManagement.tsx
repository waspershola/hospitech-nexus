import { MenuManagementTab } from '@/components/configuration/tabs/MenuManagementTab';

export default function MenuManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Menu Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage your digital menu items for guest ordering
        </p>
      </div>
      
      <MenuManagementTab />
    </div>
  );
}
