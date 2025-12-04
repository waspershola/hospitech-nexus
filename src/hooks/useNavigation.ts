import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformRole } from './usePlatformRole';
import { useNetworkStore } from '@/state/networkStore';

export interface NavigationItem {
  id: string;
  tenant_id: string;
  name: string;
  path: string;
  icon: string;
  roles_allowed: string[];
  departments_allowed: string[];
  parent_id: string | null;
  order_index: number;
  is_active: boolean;
  description?: string;
  metadata?: Record<string, any>;
  children?: NavigationItem[]; // For hierarchical navigation
}

// Static cache for offline fallback (persists across renders)
let lastCachedNav: NavigationItem[] = [];

/**
 * Platform-driven navigation hook with role + department filtering
 * Fetches navigation items from platform_nav_items via edge function
 * Supports tenant-specific overrides and global navigation
 * Includes offline caching - returns cached nav when offline
 */
export function useNavigation() {
  const { tenantId, role, department } = useAuth();
  const { platformRole } = usePlatformRole();
  const { hardOffline } = useNetworkStore();
  
  return useQuery({
    queryKey: ['platform-navigation', tenantId, role, department, platformRole],
    queryFn: async () => {
      console.log('🔍 [Navigation] Starting fetch...');
      console.log('🔍 [Navigation] Auth context:', { platformRole, tenantId, role, department });

      // Check offline state - return cache if offline
      const currentOfflineState = useNetworkStore.getState().hardOffline;
      if (currentOfflineState) {
        if (lastCachedNav.length > 0) {
          console.log('📦 [Navigation] Using cached nav (offline)');
          return lastCachedNav;
        }
        console.warn('⚠ [Navigation] Offline with no cache');
        throw new Error('OFFLINE_NO_CACHE');
      }

      try {
        // Verify we have a session with proper auth token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [Navigation] Session error:', sessionError);
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session) {
          console.error('❌ [Navigation] No active session found');
          throw new Error('No active session');
        }

        console.log('✅ [Navigation] Session valid, user ID:', session.user.id);

        // Invoke edge function with explicit auth header
        const { data, error } = await supabase.functions.invoke('platform-nav-sync', {
          body: {},
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        
        if (error) {
          console.error('❌ [Navigation] Edge function error:', error);
          throw new Error(`Navigation fetch failed: ${error.message}`);
        }

        console.log('✅ [Navigation] Edge function response:', data);
        
        if (!data?.data) {
          console.error('❌ [Navigation] Invalid response structure:', data);
          throw new Error('Invalid navigation response structure');
        }
        
        const navItems = data.data as NavigationItem[];
        console.log('✅ [Navigation] Received navigation items:', navItems.length);
      
      // Define platform roles and tenant roles
      const platformRoles = ['super_admin', 'admin', 'support_admin', 'billing_admin'];
      const tenantRoles = ['owner', 'manager', 'frontdesk', 'finance', 'accountant', 'housekeeping', 'maintenance', 'kitchen', 'bar', 'staff'];
      
      // Filter based on user's role type
      const filtered = navItems.filter(item => {
        // Check if this is a platform item (has platform roles in roles_allowed)
        const isPlatformItem = item.roles_allowed.some(r => platformRoles.includes(r));
        
        if (isPlatformItem) {
          // Platform item - check platform role
          const hasPlatformAccess = platformRole && item.roles_allowed.includes(platformRole);
          if (!hasPlatformAccess) {
            console.log(`Platform item ${item.name} filtered out - platform role mismatch. Required: ${item.roles_allowed}, User has: ${platformRole}`);
          }
          return hasPlatformAccess;
        } else {
          // Tenant item - check tenant role AND department
          const hasRole = role && item.roles_allowed.includes(role);
          if (!hasRole) {
            console.log(`Tenant item ${item.name} filtered out - role mismatch. Required: ${item.roles_allowed}, User has: ${role}`);
            return false;
          }
          
          // Check department access (empty array means visible to all departments)
          // IMPORTANT: Owners bypass department restrictions to see all navigation
          const allowedDepts = item.departments_allowed || [];
          const hasAccess = 
            allowedDepts.length === 0 || // All departments
            role === 'owner' || // Owners see everything
            (department && allowedDepts.includes(department)); // Specific department match
          
          if (!hasAccess) {
            console.log(`Tenant item ${item.name} filtered out - department mismatch. Required: ${allowedDepts}, User has: ${department}`);
          }
          
          return hasAccess;
        }
      });
      
      console.log('✅ [Navigation] Filtered navigation items:', filtered.length);
      console.log('✅ [Navigation] Items:', filtered.map(item => item.name).join(', '));
      
      // Build full hierarchical tree (supports multiple nesting levels)
      const itemsWithChildren: NavigationItem[] = filtered
        .map((item) => ({ ...item, children: [] as NavigationItem[] }))
        .sort((a, b) => a.order_index - b.order_index);

      const itemsById = new Map<string, NavigationItem>();
      itemsWithChildren.forEach((item) => {
        itemsById.set(item.id, item);
      });

      const rootItems: NavigationItem[] = [];

      itemsWithChildren.forEach((item) => {
        if (item.parent_id) {
          const parent = itemsById.get(item.parent_id);
          if (parent) {
            parent.children!.push(item);
          } else {
            // If parent is missing for some reason, treat as root to avoid losing it
            rootItems.push(item);
          }
        } else {
          rootItems.push(item);
        }
      });

      // Ensure children for every node are ordered
      const sortTree = (nodes: NavigationItem[]) => {
        nodes.sort((a, b) => a.order_index - b.order_index);
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            sortTree(node.children);
          }
        });
      };

      sortTree(rootItems);

      console.log('✅ [Navigation] Hierarchical structure:', rootItems.length, 'root items');
      
      // Cache successful result for offline use
      lastCachedNav = rootItems;
      
      return rootItems;

      } catch (error) {
        console.error('❌ [Navigation] Fatal error:', error);
        // If we have cached nav and fetch failed, return cache
        if (lastCachedNav.length > 0) {
          console.log('📦 [Navigation] Returning cached nav after error');
          return lastCachedNav;
        }
        throw error;
      }
    },
    enabled: !!platformRole || (!!tenantId && !!role),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: hardOffline ? false : 3, // No retries when offline
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
