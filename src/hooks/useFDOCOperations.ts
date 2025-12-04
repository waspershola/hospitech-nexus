/**
 * FDOC Operations Hook
 * PHASE 11: Unified hook for Front Desk Operations Center
 * 
 * Provides offline-first mutations for FDOC operations with
 * graceful fallback to online Supabase when not in Electron.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isElectronContext } from '@/lib/environment/isElectron';
import {
  offlineUpdateGuestProfile,
  offlinePostAdjustment,
  offlinePostDiscount,
  offlineLockRoom,
  offlineUnlockRoom,
  offlineForceCloseFolio,
  saveFrontDeskEvent
} from '@/lib/offline/electronFrontDeskBridge';

export function useFDOCOperations() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Update guest profile with offline support
   */
  const updateGuestProfile = useMutation({
    mutationFn: async (params: { guestId: string; updates: Record<string, any> }) => {
      console.log('[useFDOCOperations] PHASE-11: updateGuestProfile', params);

      // Try Electron offline path first
      if (isElectronContext() && tenantId) {
        const result = await offlineUpdateGuestProfile(tenantId, params.guestId, params.updates);
        
        if (result.source === 'offline' && result.data?.success) {
          // Save event to journal
          await saveFrontDeskEvent(tenantId, {
            type: 'update_guest_profile',
            guestId: params.guestId,
            timestamp: new Date().toISOString(),
            payload: params.updates
          });
          return { success: true, offline: true };
        }
        
        if (result.source === 'offline-error') {
          console.warn('[useFDOCOperations] Offline update failed, falling back to online');
        }
      }

      // Online path
      const { error } = await supabase
        .from('guests')
        .update(params.updates)
        .eq('id', params.guestId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return { success: true, offline: false };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guest-profile', variables.guestId] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      toast.success(`Guest profile updated${data.offline ? ' (offline)' : ''}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update guest: ${error.message}`);
    }
  });

  /**
   * Post adjustment to folio with offline support
   */
  const postAdjustment = useMutation({
    mutationFn: async (params: { 
      folioId: string; 
      bookingId: string;
      amount: number; 
      description: string; 
      reason?: string 
    }) => {
      console.log('[useFDOCOperations] PHASE-11: postAdjustment', params);

      // Try Electron offline path first
      if (isElectronContext() && tenantId) {
        const result = await offlinePostAdjustment(tenantId, params.folioId, {
          amount: params.amount,
          description: params.description,
          reason: params.reason
        });
        
        if (result.source === 'offline' && result.data?.success) {
          await saveFrontDeskEvent(tenantId, {
            type: 'post_adjustment',
            folioId: params.folioId,
            bookingId: params.bookingId,
            timestamp: new Date().toISOString(),
            payload: { amount: params.amount, description: params.description, reason: params.reason }
          });
          return { success: true, offline: true };
        }
        
        if (result.source === 'offline-error') {
          console.warn('[useFDOCOperations] Offline adjustment failed, falling back to online');
        }
      }

      // Online path - use folio_post_charge RPC
      const { error } = await supabase.rpc('folio_post_charge', {
        p_folio_id: params.folioId,
        p_amount: params.amount,
        p_description: params.description,
        p_transaction_type: 'adjustment'
      });

      if (error) throw error;
      return { success: true, offline: false };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-folio', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      toast.success(`Adjustment posted${data.offline ? ' (offline)' : ''}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to post adjustment: ${error.message}`);
    }
  });

  /**
   * Post discount to folio with offline support
   */
  const postDiscount = useMutation({
    mutationFn: async (params: { 
      folioId: string; 
      bookingId: string;
      amount: number; 
      description: string; 
      reason?: string 
    }) => {
      console.log('[useFDOCOperations] PHASE-11: postDiscount', params);

      // Try Electron offline path first
      if (isElectronContext() && tenantId) {
        const result = await offlinePostDiscount(tenantId, params.folioId, {
          amount: params.amount,
          description: params.description,
          reason: params.reason
        });
        
        if (result.source === 'offline' && result.data?.success) {
          await saveFrontDeskEvent(tenantId, {
            type: 'post_discount',
            folioId: params.folioId,
            bookingId: params.bookingId,
            timestamp: new Date().toISOString(),
            payload: { amount: params.amount, description: params.description, reason: params.reason }
          });
          return { success: true, offline: true };
        }
        
        if (result.source === 'offline-error') {
          console.warn('[useFDOCOperations] Offline discount failed, falling back to online');
        }
      }

      // Online path - use folio_post_charge RPC with negative amount for discount
      const { error } = await supabase.rpc('folio_post_charge', {
        p_folio_id: params.folioId,
        p_amount: -Math.abs(params.amount), // Ensure negative for discount
        p_description: params.description,
        p_transaction_type: 'discount'
      });

      if (error) throw error;
      return { success: true, offline: false };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-folio', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      toast.success(`Discount applied${data.offline ? ' (offline)' : ''}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply discount: ${error.message}`);
    }
  });

  /**
   * Lock room with offline support
   */
  const lockRoom = useMutation({
    mutationFn: async (params: { roomId: string; reason: string }) => {
      console.log('[useFDOCOperations] PHASE-11: lockRoom', params);

      // Try Electron offline path first
      if (isElectronContext() && tenantId) {
        const result = await offlineLockRoom(tenantId, params.roomId, params.reason);
        
        if (result.source === 'offline' && result.data?.success) {
          await saveFrontDeskEvent(tenantId, {
            type: 'lock_room',
            roomId: params.roomId,
            timestamp: new Date().toISOString(),
            payload: { reason: params.reason }
          });
          return { success: true, offline: true };
        }
        
        if (result.source === 'offline-error') {
          console.warn('[useFDOCOperations] Offline lock failed, falling back to online');
        }
      }

      // Online path
      const { error } = await supabase
        .from('rooms')
        .update({ 
          status: 'out_of_order',
          notes: params.reason 
        })
        .eq('id', params.roomId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return { success: true, offline: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(`Room locked${data.offline ? ' (offline)' : ''}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to lock room: ${error.message}`);
    }
  });

  /**
   * Unlock room with offline support
   */
  const unlockRoom = useMutation({
    mutationFn: async (params: { roomId: string }) => {
      console.log('[useFDOCOperations] PHASE-11: unlockRoom', params);

      // Try Electron offline path first
      if (isElectronContext() && tenantId) {
        const result = await offlineUnlockRoom(tenantId, params.roomId);
        
        if (result.source === 'offline' && result.data?.success) {
          await saveFrontDeskEvent(tenantId, {
            type: 'unlock_room',
            roomId: params.roomId,
            timestamp: new Date().toISOString(),
            payload: {}
          });
          return { success: true, offline: true };
        }
        
        if (result.source === 'offline-error') {
          console.warn('[useFDOCOperations] Offline unlock failed, falling back to online');
        }
      }

      // Online path
      const { error } = await supabase
        .from('rooms')
        .update({ 
          status: 'available',
          notes: null 
        })
        .eq('id', params.roomId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return { success: true, offline: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(`Room unlocked${data.offline ? ' (offline)' : ''}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlock room: ${error.message}`);
    }
  });

  /**
   * Force close folio (emergency night audit) with offline support
   */
  const forceCloseFolio = useMutation({
    mutationFn: async (params: { folioId: string; bookingId: string }) => {
      console.log('[useFDOCOperations] PHASE-11: forceCloseFolio', params);

      // Try Electron offline path first
      if (isElectronContext() && tenantId) {
        const result = await offlineForceCloseFolio(tenantId, params.folioId);
        
        if (result.source === 'offline' && result.data?.success) {
          await saveFrontDeskEvent(tenantId, {
            type: 'force_close_folio',
            folioId: params.folioId,
            bookingId: params.bookingId,
            timestamp: new Date().toISOString(),
            payload: {}
          });
          return { success: true, offline: true };
        }
        
        if (result.source === 'offline-error') {
          console.warn('[useFDOCOperations] Offline force close failed, falling back to online');
        }
      }

      // Online path
      const { error } = await supabase
        .from('stay_folios')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', params.folioId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return { success: true, offline: false };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-folio', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      toast.success(`Folio closed${data.offline ? ' (offline)' : ''}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to close folio: ${error.message}`);
    }
  });

  return {
    updateGuestProfile,
    postAdjustment,
    postDiscount,
    lockRoom,
    unlockRoom,
    forceCloseFolio
  };
}
