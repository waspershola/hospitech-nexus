import { Hotel, Server } from 'lucide-react';
import * as Icons from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Skeleton } from '@/components/ui/skeleton';
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

export function AppSidebar() {
  const { tenantName } = useAuth();
  const { open } = useSidebar();
  const { data: navItems, isLoading } = useNavigation();
  const { isPlatformAdmin } = usePlatformRole();

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
            {isLoading ? (
              <div className="space-y-2 px-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <SidebarMenu>
                {navItems?.map((item) => {
                  const IconComponent = Icons[item.icon as keyof typeof Icons] as any;
                  return (
                    <SidebarMenuItem key={item.id}>
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
                          {IconComponent && <IconComponent className="h-5 w-5 shrink-0" />}
                          {open && <span>{item.name}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Platform Admin Section */}
        {isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              {open ? 'Platform Admin' : ''}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Platform Admin">
                    <NavLink
                      to="/dashboard/platform-admin"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-primary'
                        }`
                      }
                    >
                      <Server className="h-5 w-5 shrink-0" />
                      {open && <span>Platform Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}