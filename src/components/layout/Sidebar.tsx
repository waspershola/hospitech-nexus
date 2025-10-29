import { Hotel, Home, Bed, Calendar, Users, FileBarChart, Settings as SettingsIcon, Wrench, LayoutDashboard, Grid3x3, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { name: 'Overview', icon: Home, path: '/dashboard', roles: ['frontdesk', 'manager', 'owner'] },
  { name: 'Front Desk', icon: LayoutDashboard, path: '/dashboard/front-desk', roles: ['frontdesk', 'manager', 'owner'] },
  { name: 'Rooms', icon: Bed, path: '/dashboard/rooms', roles: ['frontdesk', 'manager', 'owner'] },
  { name: 'Categories', icon: Grid3x3, path: '/dashboard/categories', roles: ['manager', 'owner'] },
  { name: 'Bookings', icon: Calendar, path: '/dashboard/bookings', roles: ['frontdesk', 'manager', 'owner'] },
  { name: 'Guests', icon: Users, path: '/dashboard/guests', roles: ['frontdesk', 'manager', 'owner'] },
  { name: 'Wallets', icon: Wallet, path: '/dashboard/wallets', roles: ['manager', 'owner'] },
  { name: 'Finance', icon: Wallet, path: '/dashboard/finance', roles: ['manager', 'owner'] },
  { name: 'Reports', icon: FileBarChart, path: '/dashboard/reports', roles: ['manager', 'owner'] },
  { name: 'Configuration', icon: Wrench, path: '/dashboard/configuration', roles: ['manager', 'owner'] },
  { name: 'Settings', icon: SettingsIcon, path: '/dashboard/settings', roles: ['manager', 'owner'] },
];

export function AppSidebar() {
  const { role, tenantName } = useAuth();
  const { open } = useSidebar();
  
  const filteredNav = NAV_ITEMS.filter((item) => 
    role && item.roles.includes(role)
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Hotel className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="text-sm font-display font-semibold text-sidebar-foreground">
                LuxuryHotelPro
              </span>
              {tenantName && (
                <span className="text-xs text-sidebar-foreground/70">
                  {tenantName}
                </span>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            {open ? 'Main Menu' : ''}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild tooltip={item.name}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/dashboard'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-primary'
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {open && <span>{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}