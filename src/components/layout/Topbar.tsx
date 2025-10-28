import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user, tenantName, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border">
      <div>
        <div className="font-display text-xl text-primary">Dashboard</div>
        {tenantName && <p className="text-xs text-muted-foreground">{tenantName}</p>}
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5 text-accent" />
        </Button>
        
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-charcoal">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}