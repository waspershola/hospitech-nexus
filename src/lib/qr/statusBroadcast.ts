/**
 * PHASE-2A: Unified Status Update Broadcast System
 * Centralizes status updates with cross-tab synchronization
 */

import { supabase } from '@/integrations/supabase/client';

const STATUS_CHANNEL = 'qr-request-status-updates';

// BroadcastChannel for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  broadcastChannel = new BroadcastChannel(STATUS_CHANNEL);
}

interface StatusUpdatePayload {
  requestId: string;
  status: string;
  updatedAt: string;
}

/**
 * Update request status with broadcast to all tabs and cache invalidation
 */
export async function updateRequestStatus(
  requestId: string,
  newStatus: string,
  tenantId: string,
  queryClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[statusBroadcast] Updating request status:', {
      requestId,
      newStatus,
      timestamp: new Date().toISOString()
    });

    // 1. Get current request data
    const { data: currentRequest } = await supabase
      .from('requests')
      .select('responded_at, status')
      .eq('id', requestId)
      .single();

    // 2. Build update payload
    const updatePayload: any = {
      status: newStatus,
    };

    // 3. Set responded_at on first status change from pending
    if (!currentRequest?.responded_at && currentRequest?.status === 'pending') {
      updatePayload.responded_at = new Date().toISOString();
      console.log('[statusBroadcast] Setting responded_at timestamp');
    }

    // 4. Update database
    const { error } = await supabase
      .from('requests')
      .update(updatePayload)
      .eq('id', requestId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[statusBroadcast] Database update failed:', error);
      return { success: false, error: error.message };
    }

    // 5. Broadcast to all tabs
    if (broadcastChannel) {
      const payload: StatusUpdatePayload = {
        requestId,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      broadcastChannel.postMessage(payload);
      console.log('[statusBroadcast] Broadcasted to all tabs');
    }

    // 6. Invalidate React Query cache
    await queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
    await queryClient.invalidateQueries({ queryKey: ['qr-requests'] });
    await queryClient.invalidateQueries({ queryKey: ['request-details', requestId] });

    console.log('[statusBroadcast] Cache invalidated');

    return { success: true };
  } catch (error: any) {
    console.error('[statusBroadcast] Unexpected error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Subscribe to status updates from other tabs
 */
export function subscribeToStatusUpdates(
  callback: (payload: StatusUpdatePayload) => void
): () => void {
  if (!broadcastChannel) {
    console.warn('[statusBroadcast] BroadcastChannel not supported');
    return () => {};
  }

  const handler = (event: MessageEvent<StatusUpdatePayload>) => {
    console.log('[statusBroadcast] Received update from another tab:', event.data);
    callback(event.data);
  };

  broadcastChannel.addEventListener('message', handler);

  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}
