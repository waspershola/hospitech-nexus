/**
 * useHousekeepingTasks
 * PHASE 10: Hook for housekeeping task operations with offline support
 * 
 * Tries Electron offline path first, falls back to online Supabase.
 * Browser mode uses online path only.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { isElectronContext } from '@/lib/environment/isElectron';
import {
  offlineUpdateRoomStatus,
  offlineCreateTask,
  offlineUpdateTask,
  offlineCompleteTask,
  saveHousekeepingEvent,
} from '@/lib/offline/electronHousekeepingBridge';

export function useHousekeepingTasks() {
  const queryClient = useQueryClient();
  const { tenantId, user } = useAuth();

  /**
   * Mark room as cleaned (status: available)
   */
  const markRoomCleaned = useMutation({
    mutationFn: async ({ roomId, note }: { roomId: string; note?: string }) => {
      // PHASE-10: Try Electron offline path first
      if (isElectronContext() && tenantId) {
        console.log('[useHousekeepingTasks] PHASE-10 Attempting offline markRoomCleaned:', roomId);
        
        const offlineResult = await offlineUpdateRoomStatus(tenantId, roomId, {
          status: 'available',
          note,
          cleanedBy: user?.id,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          console.log('[useHousekeepingTasks] PHASE-10 Offline room cleaned success');
          
          await saveHousekeepingEvent(tenantId, {
            type: 'room_status_updated',
            roomId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: { status: 'available', note, action: 'cleaned' },
          });

          return { id: roomId, status: 'available', offline: true };
        }
        // Fall through to online path
        console.log('[useHousekeepingTasks] PHASE-10 Falling through to online path:', offlineResult.source);
      }

      // ONLINE PATH
      const { data, error } = await supabase
        .from('rooms')
        .update({ status: 'available' })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-dashboard'] });
      toast.success('Room marked as clean');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark room clean: ${error.message}`);
    },
  });

  /**
   * Mark room as dirty (status: cleaning)
   */
  const markRoomDirty = useMutation({
    mutationFn: async ({ roomId, note }: { roomId: string; note?: string }) => {
      if (isElectronContext() && tenantId) {
        const offlineResult = await offlineUpdateRoomStatus(tenantId, roomId, {
          status: 'cleaning',
          note,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'room_status_updated',
            roomId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: { status: 'cleaning', note, action: 'marked_dirty' },
          });
          return { id: roomId, status: 'cleaning', offline: true };
        }
      }

      const { data, error } = await supabase
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-dashboard'] });
      toast.success('Room marked as dirty');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark room dirty: ${error.message}`);
    },
  });

  /**
   * Mark room as inspected
   */
  const markRoomInspected = useMutation({
    mutationFn: async ({ roomId, note }: { roomId: string; note?: string }) => {
      if (isElectronContext() && tenantId) {
        const offlineResult = await offlineUpdateRoomStatus(tenantId, roomId, {
          status: 'available',
          note,
          inspectedBy: user?.id,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'room_status_updated',
            roomId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: { status: 'available', note, action: 'inspected' },
          });
          return { id: roomId, status: 'available', offline: true };
        }
      }

      // Online: update room status and add inspection record
      const { data, error } = await supabase
        .from('rooms')
        .update({ 
          status: 'available',
          metadata: { last_inspected: new Date().toISOString(), inspected_by: user?.id }
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-dashboard'] });
      toast.success('Room inspected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark room inspected: ${error.message}`);
    },
  });

  /**
   * Mark room as out of order
   */
  const markRoomOutOfOrder = useMutation({
    mutationFn: async ({ roomId, reason }: { roomId: string; reason?: string }) => {
      if (isElectronContext() && tenantId) {
        const offlineResult = await offlineUpdateRoomStatus(tenantId, roomId, {
          status: 'maintenance',
          note: reason,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'room_status_updated',
            roomId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: { status: 'maintenance', reason, action: 'out_of_order' },
          });
          return { id: roomId, status: 'maintenance', offline: true };
        }
      }

      const { data, error } = await supabase
        .from('rooms')
        .update({ 
          status: 'maintenance',
          metadata: { out_of_order_reason: reason, out_of_order_at: new Date().toISOString() }
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-dashboard'] });
      toast.success('Room marked out of order');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark room out of order: ${error.message}`);
    },
  });

  /**
   * Add housekeeping note to a room
   */
  const addHousekeepingNote = useMutation({
    mutationFn: async ({ roomId, note }: { roomId: string; note: string }) => {
      if (isElectronContext() && tenantId) {
        await saveHousekeepingEvent(tenantId, {
          type: 'room_status_updated',
          roomId,
          staffId: user?.id,
          timestamp: new Date().toISOString(),
          payload: { note, action: 'note_added' },
        });
        return { id: roomId, note, offline: true };
      }

      // Online: Add note to room metadata
      const { data: room } = await supabase
        .from('rooms')
        .select('metadata')
        .eq('id', roomId)
        .single();

      const currentMetadata = (room?.metadata as Record<string, any>) || {};
      const notes = currentMetadata.housekeeping_notes || [];
      notes.push({ note, created_at: new Date().toISOString(), created_by: user?.id });

      const { data, error } = await supabase
        .from('rooms')
        .update({ metadata: { ...currentMetadata, housekeeping_notes: notes } })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      toast.success('Note added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });

  /**
   * Create a staff cleaning task
   */
  const createCleaningTask = useMutation({
    mutationFn: async (params: { 
      roomId: string; 
      description: string; 
      assignedTo?: string;
      priority?: 'low' | 'medium' | 'high';
    }) => {
      if (isElectronContext() && tenantId) {
        const offlineResult = await offlineCreateTask(tenantId, {
          type: 'cleaning',
          roomId: params.roomId,
          description: params.description,
          assignedTo: params.assignedTo,
          priority: params.priority,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'task_created',
            roomId: params.roomId,
            taskId: offlineResult.data.taskId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: params,
          });
          return { taskId: offlineResult.data.taskId, offline: true };
        }
      }

      // Online: Create request as housekeeping task
      const { data, error } = await supabase
        .from('requests')
        .insert({
          tenant_id: tenantId,
          room_id: params.roomId,
          type: 'housekeeping',
          note: params.description,
          status: 'pending',
          priority: params.priority || 'medium',
          assigned_to: params.assignedTo,
          assigned_department: 'housekeeping',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-dashboard'] });
      toast.success('Cleaning task created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  /**
   * Complete a staff task
   */
  const completeTask = useMutation({
    mutationFn: async ({ taskId, note }: { taskId: string; note?: string }) => {
      if (isElectronContext() && tenantId && user?.id) {
        const offlineResult = await offlineCompleteTask(tenantId, taskId, {
          completedBy: user.id,
          note,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'task_completed',
            taskId,
            staffId: user.id,
            timestamp: new Date().toISOString(),
            payload: { note },
          });
          return { taskId, status: 'completed', offline: true };
        }
      }

      const { data, error } = await supabase
        .from('requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-dashboard'] });
      toast.success('Task completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete task: ${error.message}`);
    },
  });

  return {
    markRoomCleaned,
    markRoomDirty,
    markRoomInspected,
    markRoomOutOfOrder,
    addHousekeepingNote,
    createCleaningTask,
    completeTask,
    isLoading: 
      markRoomCleaned.isPending || 
      markRoomDirty.isPending || 
      markRoomInspected.isPending ||
      markRoomOutOfOrder.isPending ||
      createCleaningTask.isPending ||
      completeTask.isPending,
  };
}
