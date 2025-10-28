import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-charcoal mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-display text-charcoal mb-4">Account Information</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{role}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-display text-charcoal mb-4">Hotel Settings</h3>
        <div className="text-center py-8 text-muted-foreground">
          Hotel configuration options coming soon
        </div>
      </Card>
    </div>
  );
}