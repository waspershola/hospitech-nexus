import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNotificationSound } from './useNotificationSound';
import { calculateEscalatedPriority, type Priority } from '@/utils/priorityEscalation';

export interface DepartmentRequest {
  id: string;
  tenant_id: string;
  guest_id: string | null;
  room_id: string | null;
  type: string;
  service_category: string;
  note: string;
  status: string;
  priority: string;
  qr_token: string;
  metadata: any;
  created_at: string;
  updated_at?: string;
  assigned_to?: string | null;
  assigned_department?: string;
  completed_at?: string;
  room?: { number: string };
  guest?: { name: string };
  escalated_priority?: Priority;
  is_escalated?: boolean;
}

export interface DepartmentMetrics {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedToday: number;
  avgResponseTimeMinutes: number;
  myAssignedRequests: number;
}

export function useDepartmentRequests(department?: string) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const { playSound } = useNotificationSound();

  // Fetch department requests with room and guest info
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['department-requests', tenantId, department],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('requests')
        .select(`
          *,
          room:rooms(number),
          guest:guests(name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Filter by department if specified
      if (department && department !== 'all') {
        query = query.eq('assigned_department', department);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate escalated priority for each request
      const requestsWithEscalation = (data || []).map(request => {
        const escalatedPriority = calculateEscalatedPriority(
          request.priority as Priority,
          request.created_at
        );
        
        return {
          ...request,
          escalated_priority: escalatedPriority,
          is_escalated: escalatedPriority !== request.priority,
        };
      });

      return requestsWithEscalation as unknown as DepartmentRequest[];
    },
    enabled: !!tenantId,
  });

  // Real-time subscription for new and updated requests
  useEffect(() => {
    if (!tenantId) return;

    console.log('[useDepartmentRequests] Setting up real-time subscription for department:', department);

    const channel = supabase
      .channel('department-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: department && department !== 'all' ? `assigned_department=eq.${department}` : undefined,
        },
        (payload) => {
          console.log('[useDepartmentRequests] New request received:', payload);
          queryClient.invalidateQueries({ queryKey: ['department-requests'] });
          
          // Show notification
          const newRequest = payload.new as DepartmentRequest;
          toast.info('New Request', {
            description: `${newRequest.service_category} - ${newRequest.metadata?.guest_name || 'Guest'}`,
          });
          
          // Play notification sound
          playSound('qr_request');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: department && department !== 'all' ? `assigned_department=eq.${department}` : undefined,
        },
        (payload) => {
          console.log('[useDepartmentRequests] Request updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['department-requests'] });
        }
      )
      .subscribe();

    return () => {
      console.log('[useDepartmentRequests] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [tenantId, department, queryClient]);

  // Calculate metrics
  const metrics: DepartmentMetrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const inProgressRequests = requests.filter(r => r.status === 'in_progress');
    const completedToday = requests.filter(
      r => (r.status === 'completed' || r.status === 'approved') && r.updated_at && new Date(r.updated_at) >= todayStart
    ).length;

    // Calculate average response time for completed requests today
    const completedTodayRequests = requests.filter(
      r => (r.status === 'completed' || r.status === 'approved') && r.updated_at && new Date(r.updated_at) >= todayStart
    );
    
    const totalResponseTime = completedTodayRequests.reduce((sum, request) => {
      if (!request.updated_at) return sum;
      const created = new Date(request.created_at).getTime();
      const updated = new Date(request.updated_at).getTime();
      return sum + (updated - created);
    }, 0);

    const avgResponseTimeMinutes = completedTodayRequests.length > 0
      ? Math.round(totalResponseTime / completedTodayRequests.length / 60000)
      : 0;

    const myAssignedRequests = requests.filter(
      r => r.assigned_to === user?.id && r.status !== 'completed' && r.status !== 'cancelled'
    ).length;

    return {
      totalRequests: requests.length,
      pendingRequests: pendingRequests.length,
      inProgressRequests: inProgressRequests.length,
      completedToday,
      avgResponseTimeMinutes,
      myAssignedRequests,
    };
  }, [requests, user]);

  // Assign request to current user
  const claimRequest = async (requestId: string) => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          assigned_to: user.id,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['department-requests'] });
      toast.success('Request claimed successfully');
    } catch (error) {
      console.error('Error claiming request:', error);
      toast.error('Failed to claim request');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update request status
  const updateRequestStatus = async (requestId: string, status: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['department-requests'] });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Unassign request (return to pool)
  const unassignRequest = async (requestId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          assigned_to: null,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['department-requests'] });
      toast.success('Request returned to pool');
    } catch (error) {
      console.error('Error unassigning request:', error);
      toast.error('Failed to unassign request');
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    requests,
    isLoading,
    isUpdating,
    metrics,
    claimRequest,
    updateRequestStatus,
    unassignRequest,
  };
}
