import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useLogStaffActivity } from './useStaffActivity';

export interface StaffMetadata {
  employee_id?: string;
  job_title?: string;
  employment_type?: string;
  hire_date?: string;
  shift_group?: string;
  access_level?: string;
  gender?: string;
  date_of_birth?: string;
  national_id?: string;
  profile_photo_url?: string;
  bank_details?: {
    bank_name: string;
    account_number: string;
  };
  compensation?: {
    salary_type: string;
    base_salary: number;
    currency: string;
  };
  onboarding_notes?: string;
}

export interface Staff {
  id: string;
  tenant_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  role?: string;
  supervisor_id?: string;
  branch?: string;
  status: 'active' | 'suspended' | 'inactive';
  metadata?: StaffMetadata;
  created_at: string;
  updated_at: string;
}

export interface StaffFilters {
  department?: string;
  role?: string;
  status?: string;
  search?: string;
}

export function useStaffManagement(filters?: StaffFilters) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const { logActivity } = useLogStaffActivity();

  // Fetch staff list
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (filters?.department) {
        query = query.eq('department', filters.department);
      }
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Staff[];
    },
    enabled: !!tenantId,
  });

  // Create staff
  const createStaff = useMutation({
    mutationFn: async (newStaff: Omit<Staff, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.functions.invoke('manage-staff/create', {
        body: newStaff,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      // Edge function returns { success: true, data: staff, ... }
      // Return the actual staff data from the nested structure
      return data?.data || data;
    },
    onSuccess: async () => {
      // Invalidate and refetch immediately
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      await queryClient.refetchQueries({ queryKey: ['staff', tenantId] });
      
      toast({
        title: 'Success',
        description: 'Staff member created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update staff
  const updateStaff = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      // Cast metadata to Json type for Supabase
      const updateData: any = updates.metadata 
        ? { ...updates, metadata: JSON.parse(JSON.stringify(updates.metadata)) }
        : updates;
        
      const { data, error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data as Staff;
    },
    onSuccess: async (data) => {
      // Log the update activity
      if (user && data) {
        await logActivity({
          staff_id: data.id,
          department: data.department,
          role: data.role,
          action: 'staff_updated',
          description: `Staff member ${data.full_name} details updated`,
          metadata: { updated_by: user.id },
        }).catch(console.error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: 'Success',
        description: 'Staff member updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Change status
  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Staff['status'] }) => {
      const { data, error } = await supabase
        .from('staff')
        .update({ status })
        .eq('id', id)
        .eq('tenant_id', tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Log the status change activity
      if (user && data) {
        await logActivity({
          staff_id: data.id,
          department: data.department,
          role: data.role,
          action: 'staff_status_changed',
          description: `Staff member ${data.full_name} status changed to ${data.status}`,
          metadata: { 
            changed_by: user.id,
            new_status: data.status 
          },
        }).catch(console.error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: 'Success',
        description: 'Staff status updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove staff
  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      // Get staff info before deleting for logging
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId!)
        .single();
      
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!);

      if (error) throw error;
      return staffData;
    },
    onSuccess: async (staffData) => {
      // Log the removal activity
      if (user && staffData) {
        await logActivity({
          staff_id: user.id, // Log who performed the deletion
          department: staffData.department,
          role: staffData.role,
          action: 'staff_removed',
          description: `Staff member ${staffData.full_name} (${staffData.email}) was removed from the system`,
          metadata: { 
            removed_by: user.id,
            removed_staff_id: staffData.id,
            removed_staff_email: staffData.email 
          },
        }).catch(console.error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: 'Success',
        description: 'Staff member removed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    staff,
    isLoading,
    createStaff,
    updateStaff,
    changeStatus,
    removeStaff,
  };
}
