import { Hotel, ChevronDown } from 'lucide-react';
import * as Icons from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation, NavigationItem } from '@/hooks/useNavigation';
import { useRequestNotificationCount } from '@/hooks/useRequestNotificationCount';
import { useQRBillingTasks } from '@/hooks/useQRBillingTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo, useEffect } from 'react';
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
import { SidebarSearch } from './SidebarSearch';

export function AppSidebar() {
  const { tenantName } = useAuth();
  const { open, isMobile, setOpenMobile } = useSidebar();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const notificationCount = useRequestNotificationCount();
  const { count: billingTasksCount } = useQRBillingTasks();
  
  // Use unified navigation hook for all users (platform and tenant)
  const { data: navItems, isLoading, error } = useNavigation();

  // Auto-expand parent group containing active route on initial load
  useEffect(() => {
    if (!navItems || searchQuery) return;
    
    // Find parent group containing the active route
    const activeParent = navItems.find(item => 
      item.children?.some(child => 
        location.pathname === child.path || 
        location.pathname.startsWith(child.path + '/')
      )
    );
    
    if (activeParent) {
      // Only expand the active parent, close all others (accordion mode)
      setOpenGroups({ [activeParent.id]: true });
    }
  }, [navItems, location.pathname, searchQuery]);

  // Filter navigation items based on search query (fuzzy matching)
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems || [];
    
    const query = searchQuery.toLowerCase();
    
    const filterItems = (items: NavigationItem[]): NavigationItem[] => {
      return items.reduce((acc, item) => {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDescription = item.description?.toLowerCase().includes(query);
        const matchesPath = item.path.toLowerCase().includes(query);
        const matches = matchesName || matchesDescription || matchesPath;
        
        // Check if any children match
        const filteredChildren = item.children ? filterItems(item.children) : [];
        
        // Include item if it matches OR has matching children
        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children,
          });
        }
        
        return acc;
      }, [] as NavigationItem[]);
    };
    
    const filtered = filterItems(navItems || []);
    
    // Auto-expand groups that have matching children when searching
    if (searchQuery.trim() && filtered.length > 0) {
      const newOpenGroups: Record<string, boolean> = {};
      filtered.forEach(item => {
        if (item.children && item.children.length > 0) {
          newOpenGroups[item.id] = true;
        }
      });
      setOpenGroups(prev => ({ ...prev, ...newOpenGroups }));
    }
    
    return filtered;
  }, [navItems, searchQuery]);
  
  // Auto-close sidebar on mobile after navigation
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Debug logging
  console.log('📱 [Sidebar] Render:', { 
    navItemsCount: navItems?.length, 
    filteredCount: filteredNavItems.length,
    searchQuery,
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

      {/* Search Input - Only visible when sidebar is open */}
      {open && (
        <div className="pt-2">
          <SidebarSearch 
            value={searchQuery} 
            onChange={setSearchQuery}
            placeholder="Search menu..."
          />
        </div>
      )}

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
            ) : filteredNavItems && filteredNavItems.length > 0 ? (
              <SidebarMenu>
                {filteredNavItems.map((item) => {
                  const IconComponent = Icons[item.icon as keyof typeof Icons] as any;
                  
                  // Parent item with children (collapsible group)
                  if (item.children && item.children.length > 0) {
                    // Accordion mode: default closed unless explicitly opened or during search
                    const isOpen = searchQuery ? (openGroups[item.id] ?? false) : (openGroups[item.id] ?? false);
                    const isContainer = item.path.startsWith('#');
                    
                    // Accordion mode: close all others when opening one
                    const handleGroupToggle = (open: boolean) => {
                      if (open) {
                        // Close all other groups, open only this one
                        setOpenGroups({ [item.id]: true });
                      } else {
                        // Close this group
                        setOpenGroups(prev => ({ ...prev, [item.id]: false }));
                      }
                    };
                    
                    return (
                      <Collapsible
                        key={item.id}
                        open={isOpen}
                        onOpenChange={searchQuery ? ((open) => setOpenGroups(prev => ({ ...prev, [item.id]: open }))) : handleGroupToggle}
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
                                const hasGrandChildren = child.children && child.children.length > 0;
                                return (
                                  <SidebarMenuSubItem key={child.id}>
                                    <SidebarMenuSubButton asChild>
                                      {hasGrandChildren ? (
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sidebar-foreground/90">
                                            {ChildIcon && <ChildIcon className="h-4 w-4 shrink-0" />}
                                            {open && <span className="font-medium text-sm">{child.name}</span>}
                                          </div>
                                          <div className="flex flex-col gap-1 pl-7">
                                            {child.children!.map((grand) => {
                                              const GrandIcon = Icons[grand.icon as keyof typeof Icons] as any;
                                              return (
                                                <NavLink
                                                  key={grand.id}
                                                  to={grand.path}
                                                  onClick={handleNavClick}
                                                  className={({ isActive }) =>
                                                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                                      isActive
                                                        ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold'
                                                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/20 hover:text-sidebar-primary'
                                                    }`
                                                  }
                                                >
                                                  {GrandIcon && <GrandIcon className="h-3 w-3 shrink-0" />}
                                                  {open && <span>{grand.name}</span>}
                                                </NavLink>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : (
                                        <NavLink
                                          to={child.path}
                                          onClick={handleNavClick}
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
                                              {child.path === '/dashboard/qr-billing-tasks' && billingTasksCount > 0 && (
                                                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-medium text-white">
                                                  {billingTasksCount > 99 ? '99+' : billingTasksCount}
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </NavLink>
                                      )}
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
                  
                  // Regular nav item (no children) - Skip container paths that start with #
                  if (item.path.startsWith('#')) {
                    return null;
                  }
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild tooltip={item.name}>
                        <NavLink
                          to={item.path}
                          end={item.path === '/dashboard'}
                          onClick={handleNavClick}
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
            ) : searchQuery ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No results found for "{searchQuery}"
              </div>
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
