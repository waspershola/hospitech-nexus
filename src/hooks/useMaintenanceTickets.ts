/**
 * useMaintenanceTickets
 * PHASE 10: Hook for maintenance ticket operations with offline support
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
  offlineCreateMaintenanceTicket,
  offlineUpdateMaintenanceTicket,
  saveHousekeepingEvent,
} from '@/lib/offline/electronHousekeepingBridge';

export function useMaintenanceTickets() {
  const queryClient = useQueryClient();
  const { tenantId, user } = useAuth();

  /**
   * Create a maintenance ticket for a room
   */
  const createTicket = useMutation({
    mutationFn: async (params: {
      roomId: string;
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      category?: string;
      assignedTo?: string;
    }) => {
      // PHASE-10: Try Electron offline path first
      if (isElectronContext() && tenantId) {
        console.log('[useMaintenanceTickets] PHASE-10 Attempting offline createTicket');
        
        const offlineResult = await offlineCreateMaintenanceTicket(tenantId, {
          roomId: params.roomId,
          title: params.title,
          description: params.description,
          priority: params.priority,
          category: params.category,
          assignedTo: params.assignedTo,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          console.log('[useMaintenanceTickets] PHASE-10 Offline ticket created:', offlineResult.data.ticketId);
          
          await saveHousekeepingEvent(tenantId, {
            type: 'maintenance_ticket_created',
            roomId: params.roomId,
            ticketId: offlineResult.data.ticketId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: params,
          });

          return { ticketId: offlineResult.data.ticketId, offline: true };
        }
        // Fall through to online path
        console.log('[useMaintenanceTickets] PHASE-10 Falling through to online:', offlineResult.source);
      }

      // ONLINE PATH: Create as maintenance request
      const { data, error } = await supabase
        .from('requests')
        .insert({
          tenant_id: tenantId,
          room_id: params.roomId,
          type: 'maintenance',
          note: `${params.title}${params.description ? `: ${params.description}` : ''}`,
          status: 'pending',
          priority: params.priority || 'medium',
          assigned_to: params.assignedTo,
          assigned_department: 'maintenance',
          metadata: {
            title: params.title,
            description: params.description,
            category: params.category,
            created_by: user?.id,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      toast.success('Maintenance ticket created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });

  /**
   * Update maintenance ticket status
   */
  const updateTicketStatus = useMutation({
    mutationFn: async ({ 
      ticketId, 
      status, 
      note 
    }: { 
      ticketId: string; 
      status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
      note?: string;
    }) => {
      if (isElectronContext() && tenantId) {
        const offlineResult = await offlineUpdateMaintenanceTicket(tenantId, ticketId, {
          status,
          note,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'maintenance_ticket_updated',
            ticketId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: { status, note },
          });
          return { ticketId, status, offline: true };
        }
      }

      const updateData: any = { status };
      if (status === 'resolved') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      toast.success('Ticket status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    },
  });

  /**
   * Assign maintenance ticket to staff member
   */
  const assignTicket = useMutation({
    mutationFn: async ({ 
      ticketId, 
      assignedTo 
    }: { 
      ticketId: string; 
      assignedTo: string;
    }) => {
      if (isElectronContext() && tenantId) {
        const offlineResult = await offlineUpdateMaintenanceTicket(tenantId, ticketId, {
          assignedTo,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'maintenance_ticket_updated',
            ticketId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: { assignedTo, action: 'assigned' },
          });
          return { ticketId, assignedTo, offline: true };
        }
      }

      const { data, error } = await supabase
        .from('requests')
        .update({ assigned_to: assignedTo, status: 'in_progress' })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      toast.success('Ticket assigned');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign ticket: ${error.message}`);
    },
  });

  /**
   * Add note to maintenance ticket
   */
  const addTicketNote = useMutation({
    mutationFn: async ({ 
      ticketId, 
      note 
    }: { 
      ticketId: string; 
      note: string;
    }) => {
      if (isElectronContext() && tenantId) {
        await saveHousekeepingEvent(tenantId, {
          type: 'maintenance_ticket_updated',
          ticketId,
          staffId: user?.id,
          timestamp: new Date().toISOString(),
          payload: { note, action: 'note_added' },
        });
        return { ticketId, note, offline: true };
      }

      // Online: Update request metadata with new note
      const { data: ticket } = await supabase
        .from('requests')
        .select('metadata')
        .eq('id', ticketId)
        .single();

      const currentMetadata = (ticket?.metadata as Record<string, any>) || {};
      const notes = currentMetadata.notes || [];
      notes.push({ 
        note, 
        created_at: new Date().toISOString(), 
        created_by: user?.id 
      });

      const { data, error } = await supabase
        .from('requests')
        .update({ metadata: { ...currentMetadata, notes } })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      toast.success('Note added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });

  /**
   * Resolve maintenance ticket and optionally update room status
   */
  const resolveTicket = useMutation({
    mutationFn: async ({ 
      ticketId, 
      resolution, 
      roomId,
      restoreRoomStatus 
    }: { 
      ticketId: string; 
      resolution?: string;
      roomId?: string;
      restoreRoomStatus?: boolean;
    }) => {
      if (isElectronContext() && tenantId) {
        const offlineResult = await offlineUpdateMaintenanceTicket(tenantId, ticketId, {
          status: 'resolved',
          note: resolution,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          await saveHousekeepingEvent(tenantId, {
            type: 'maintenance_ticket_updated',
            ticketId,
            roomId,
            staffId: user?.id,
            timestamp: new Date().toISOString(),
            payload: { status: 'resolved', resolution, restoreRoomStatus },
          });
          return { ticketId, status: 'resolved', offline: true };
        }
      }

      // Update ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: { resolution, resolved_by: user?.id }
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Optionally restore room status
      if (restoreRoomStatus && roomId) {
        await supabase
          .from('rooms')
          .update({ status: 'cleaning' })
          .eq('id', roomId);
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      toast.success('Ticket resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve ticket: ${error.message}`);
    },
  });

  return {
    createTicket,
    updateTicketStatus,
    assignTicket,
    addTicketNote,
    resolveTicket,
    isLoading: 
      createTicket.isPending || 
      updateTicketStatus.isPending || 
      assignTicket.isPending ||
      addTicketNote.isPending ||
      resolveTicket.isPending,
  };
}
