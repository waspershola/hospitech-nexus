import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, MessageSquare, CreditCard, LogOut, Hotel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PORTAL_NAV = [
  { name: 'Home', icon: Home, path: '/portal' },
  { name: 'Requests', icon: MessageSquare, path: '/portal/requests' },
  { name: 'Payments', icon: CreditCard, path: '/portal/payments' },
];

export default function GuestPortalShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-offWhite pb-20">
      <header className="bg-cardWhite border-b border-border shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Hotel className="w-6 h-6 text-accent" />
            <span className="font-display text-lg text-charcoal">Guest Portal</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-cardWhite border-t border-border shadow-luxury">
        <div className="flex items-center justify-around py-2">
          {PORTAL_NAV.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/portal'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
                  isActive ? 'text-accent' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon size={24} />
              <span className="text-xs font-medium">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}