// ROOM-CATEGORY-COLOR-MARKERS-V1: Hook for display-related tenant configurations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DisplayPreferences {
  showCategoryColorMarkers: boolean;
}

export function useDisplayPreferences() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['display-preferences', tenantId],
    queryFn: async (): Promise<DisplayPreferences> => {
      if (!tenantId) return { showCategoryColorMarkers: true };
      
      const { data, error } = await supabase
        .from('hotel_configurations')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .in('key', ['show_category_color_markers']);
      
      if (error) throw error;
      
      const showMarkers = data?.find(c => c.key === 'show_category_color_markers');
      
      return {
        showCategoryColorMarkers: showMarkers?.value !== false,
      };
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });

  const updatePreference = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('hotel_configurations')
        .upsert({
          tenant_id: tenantId,
          key,
          value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,key',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['display-preferences', tenantId] });
    },
  });

  return {
    preferences: query.data ?? { showCategoryColorMarkers: true },
    isLoading: query.isLoading,
    updatePreference: updatePreference.mutate,
    isUpdating: updatePreference.isPending,
  };
}
