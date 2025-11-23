import { Hotel, ChevronDown } from 'lucide-react';
import * as Icons from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useRequestNotificationCount } from '@/hooks/useRequestNotificationCount';
import { useQRBillingTasks } from '@/hooks/useQRBillingTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function AppSidebar() {
  const { tenantName } = useAuth();
  const { open } = useSidebar();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const notificationCount = useRequestNotificationCount();
  const { count: billingTasksCount } = useQRBillingTasks();
  
  // Use unified navigation hook for all users (platform and tenant)
  const { data: navItems, isLoading, error } = useNavigation();

  // Debug logging
  console.log('📱 [Sidebar] Render:', { 
    navItemsCount: navItems?.length, 
    isLoading, 
    hasError: !!error,
    errorMessage: error?.message 
  });

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
            ) : error ? (
              <div className="px-4 py-3 text-sm text-destructive">
                <p className="font-semibold">Navigation Error</p>
                <p className="text-xs mt-1">{error.message}</p>
              </div>
            ) : navItems && navItems.length > 0 ? (
              <SidebarMenu>
                {navItems.map((item) => {
                  const IconComponent = Icons[item.icon as keyof typeof Icons] as any;
                  
                  // Parent item with children (collapsible group)
                  if (item.children && item.children.length > 0) {
                    const isOpen = openGroups[item.id] ?? true;
                    
                    return (
                      <Collapsible
                        key={item.id}
                        open={isOpen}
                        onOpenChange={(open) => setOpenGroups(prev => ({ ...prev, [item.id]: open }))}
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.name}>
                              {IconComponent && <IconComponent className="h-5 w-5 shrink-0" />}
                              {open && <span>{item.name}</span>}
                              {open && <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => {
                                const ChildIcon = Icons[child.icon as keyof typeof Icons] as any;
                                return (
                                  <SidebarMenuSubItem key={child.id}>
                                    <SidebarMenuSubButton asChild>
                                       <NavLink
                                        to={child.path}
                                        className={({ isActive }) =>
                                          `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                                            isActive
                                              ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold'
                                              : 'text-sidebar-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-primary'
                                          }`
                                        }
                                      >
                                        {ChildIcon && <ChildIcon className="h-4 w-4 shrink-0" />}
                                        {open && (
                                          <span className="flex items-center justify-between flex-1">
                                            <span>{child.name}</span>
                                            {child.path === '/dashboard/department-requests' && notificationCount > 0 && (
                                              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                                                {notificationCount > 99 ? '99+' : notificationCount}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </NavLink>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }
                  
                  // Regular nav item (no children)
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
                          {open && (
                            <span className="flex items-center justify-between flex-1">
                              <span>{item.name}</span>
                              {item.path === '/dashboard/department-requests' && notificationCount > 0 && (
                                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                                  {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                              )}
                              {item.path === '/dashboard/qr-billing-tasks' && billingTasksCount > 0 && (
                                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-medium text-white">
                                  {billingTasksCount > 99 ? '99+' : billingTasksCount}
                                </span>
                              )}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No navigation items
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  );
}