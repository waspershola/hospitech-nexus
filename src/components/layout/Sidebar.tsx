import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Bed, Calendar, Users, FileBarChart, Settings, Hotel } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: Home, path: '/dashboard', roles: ['owner', 'manager', 'frontdesk', 'housekeeping'] },
  { name: 'Rooms', icon: Bed, path: '/dashboard/rooms', roles: ['owner', 'manager', 'frontdesk', 'housekeeping'] },
  { name: 'Bookings', icon: Calendar, path: '/dashboard/bookings', roles: ['owner', 'manager', 'frontdesk'] },
  { name: 'Guests', icon: Users, path: '/dashboard/guests', roles: ['owner', 'manager', 'frontdesk'] },
  { name: 'Reports', icon: FileBarChart, path: '/dashboard/reports', roles: ['owner', 'manager'] },
  { name: 'Settings', icon: Settings, path: '/dashboard/settings', roles: ['owner', 'manager'] },
];

export default function Sidebar() {
  const { role } = useAuth();

  const filteredNav = NAV_ITEMS.filter(item => 
    role && item.roles.includes(role)
  );

  return (
    <aside className="hidden md:flex w-64 bg-offWhite border-r border-border shadow-md flex-col">
      <div className="h-20 flex items-center justify-center gap-2 border-b border-border">
        <Hotel className="w-8 h-8 text-accent" />
        <span className="text-xl font-display text-accent">LuxuryHotelPro</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {filteredNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-accent text-white shadow-accent'
                  : 'text-charcoal hover:bg-accent/10 hover:text-accent'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}