import { NavLink } from 'react-router-dom';
import { Home, Bed, Calendar, Settings } from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { name: 'Home', icon: Home, path: '/dashboard' },
  { name: 'Rooms', icon: Bed, path: '/dashboard/rooms' },
  { name: 'Bookings', icon: Calendar, path: '/dashboard/bookings' },
  { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-cardWhite border-t border-border shadow-luxury">
      <div className="flex items-center justify-around py-2">
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-accent'
                  : 'text-muted-foreground'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-xs font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}