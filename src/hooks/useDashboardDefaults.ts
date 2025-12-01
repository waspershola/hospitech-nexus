import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DashboardDefault {
  id: string;
  tenant_id: string;
  dashboard_name: string;
  default_location_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useDashboardDefaults() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard-defaults', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('hotel_dashboard_defaults')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data as DashboardDefault[];
    },
    enabled: !!tenantId,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({
      dashboard_name,
      default_location_id,
    }: {
      dashboard_name: string;
      default_location_id: string | null;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('hotel_dashboard_defaults')
        .upsert({
          tenant_id: tenantId,
          dashboard_name,
          default_location_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-defaults', tenantId] });
      toast.success('Dashboard default location updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update default: ${error.message}`);
    },
  });

  const getDefaultLocation = (dashboardName: string): string | null => {
    const defaults = query.data || [];
    const dashboardDefault = defaults.find((d) => d.dashboard_name === dashboardName);
    return dashboardDefault?.default_location_id || null;
  };

  /**
   * PAYMENT-ENFORCEMENT-V1: Check if user role allows location override
   * Owner/Manager can always change, FrontDesk/Staff must use defaults
   */
  const isLocationChangeAllowed = (userRole: string): boolean => {
    const managerRoles = ['owner', 'manager'];
    return managerRoles.includes(userRole.toLowerCase());
  };

  /**
   * PAYMENT-ENFORCEMENT-V1: Check if changing from default requires manager override
   */
  const requiresManagerOverride = (
    currentLocationId: string | undefined,
    newLocationId: string,
    dashboardContext: string
  ): boolean => {
    const defaultLocationId = getDefaultLocation(dashboardContext);
    
    // If no default configured, allow any selection
    if (!defaultLocationId) return false;
    
    // If trying to change from default to something else, requires override
    if (currentLocationId === defaultLocationId && newLocationId !== defaultLocationId) {
      return true;
    }
    
    return false;
  };

  return {
    defaults: query.data ?? [],
    isLoading: query.isLoading,
    getDefaultLocation,
    setDefault: upsertMutation.mutate,
    isUpdating: upsertMutation.isPending,
    isLocationChangeAllowed,
    requiresManagerOverride,
  };
}
