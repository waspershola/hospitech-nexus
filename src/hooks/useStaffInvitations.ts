import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StaffInvitation {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  department: string | null;
  role: string | null;
  invitation_token: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface InviteStaffData {
  full_name: string;
  email: string;
  department: string;
  role: string;
  branch?: string;
  supervisor_id?: string;
}

export function useStaffInvitations() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all invitations
  const { data: invitations, isLoading, error } = useQuery({
    queryKey: ['staff-invitations', tenantId],
    queryFn: async () => {
      console.log('[useStaffInvitations] Fetching invitations for tenant:', tenantId);
      
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useStaffInvitations] Error fetching invitations:', error);
        throw error;
      }
      
      console.log('[useStaffInvitations] Fetched invitations:', data);
      return data as StaffInvitation[];
    },
    enabled: !!tenantId,
  });

  // Invite staff mutation
  const inviteStaff = useMutation({
    mutationFn: async (inviteData: InviteStaffData) => {
      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: inviteData,
      });

      if (error) {
        // Parse error message from edge function
        const errorMessage = error.message || 'Failed to send invitation';
        throw new Error(errorMessage);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations', tenantId] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: any) => {
      console.error('[inviteStaff] Error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already exists')) {
        toast.error('A pending invitation already exists for this email. Please cancel the existing invitation first or wait for it to expire.');
      } else if (error.message?.includes('Unauthorized')) {
        toast.error('You do not have permission to send invitations');
      } else {
        toast.error(error.message || 'Failed to send invitation');
      }
    },
  });

  // Resend invitation
  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const invitation = invitations?.find(inv => inv.id === invitationId);
      if (!invitation) throw new Error('Invitation not found');

      const { data, error } = await supabase.functions.invoke('invite-staff', {
        body: {
          full_name: invitation.full_name,
          email: invitation.email,
          department: invitation.department,
          role: invitation.role,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations', tenantId] });
      toast.success('Invitation resent successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resend invitation');
    },
  });

  // Cancel invitation
  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('staff_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations', tenantId] });
      toast.success('Invitation cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel invitation');
    },
  });

  return {
    invitations,
    isLoading,
    error,
    inviteStaff,
    resendInvitation,
    cancelInvitation,
  };
}

// Hook to accept invitation (for new staff)
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({
      token,
      password,
    }: {
      token: string;
      password: string;
    }) => {
      // Get invitation details
      const { data: invitation, error: invError } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: invitation.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create account');

      // Create staff record
      const { error: staffError } = await supabase.from('staff').insert({
        tenant_id: invitation.tenant_id,
        user_id: authData.user.id,
        full_name: invitation.full_name,
        email: invitation.email,
        department: invitation.department,
        role: invitation.role,
        status: 'active',
      });

      if (staffError) throw staffError;

      // Mark invitation as accepted
      await supabase
        .from('staff_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      return { user: authData.user, invitation };
    },
    onSuccess: () => {
      toast.success('Account created successfully! Welcome aboard!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept invitation');
    },
  });
}
