import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrganizationMember {
  id: string;
  tenant_id: string;
  organization_id: string;
  guest_id: string;
  role: string;
  added_by: string | null;
  created_at: string;
}

export function useOrganizationMembers(organizationId?: string) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['organization-members', tenantId, organizationId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('organization_members')
        .select(`
          *,
          guest:guests(id, name, email, phone)
        `)
        .eq('tenant_id', tenantId);
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ organizationId, guestId, role = 'member' }: { organizationId: string; guestId: string; role?: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('organization_members')
        .insert([{
          tenant_id: tenantId,
          organization_id: organizationId,
          guest_id: guestId,
          role,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', tenantId] });
      toast.success('Member added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add member: ${error.message}`);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', tenantId] });
      toast.success('Member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    addMember: addMemberMutation.mutate,
    removeMember: removeMemberMutation.mutate,
  };
}
