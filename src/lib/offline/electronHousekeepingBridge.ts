/**
 * Electron Housekeeping Bridge
 * PHASE 10: Safe wrappers for Electron offline housekeeping/task APIs
 * 
 * All methods return { data, error, source } and NEVER throw.
 * Browser mode returns immediately with no-op results.
 */

import { isElectronContext } from '@/lib/environment/isElectron';

// Result type for all bridge operations
export interface BridgeResult<T> {
  data: T | null;
  error: Error | null;
  source: 'offline' | 'browser' | 'electron-no-api' | 'offline-error';
}

// Room status update payload
export interface RoomStatusPayload {
  status: string;
  note?: string;
  inspectedBy?: string;
  cleanedBy?: string;
}

// Maintenance ticket payload
export interface MaintenanceTicketPayload {
  roomId: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  assignedTo?: string;
}

// Task payload
export interface TaskPayload {
  type: 'cleaning' | 'delivery' | 'maintenance' | 'inspection' | 'turndown' | 'other';
  roomId?: string;
  description: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  dueAt?: string;
}

// Housekeeping event for event journal
export interface HousekeepingEvent {
  type: 
    | 'room_status_updated' 
    | 'maintenance_ticket_created' 
    | 'maintenance_ticket_updated'
    | 'task_created'
    | 'task_updated'
    | 'task_completed'
    | 'checklist_item_completed';
  roomId?: string;
  ticketId?: string;
  taskId?: string;
  staffId?: string;
  timestamp: string;
  payload: any;
}

/**
 * Update room status via Electron offline API
 * Supports: clean, cleaning, dirty, inspected, ready, out_of_order, turnover, dnd
 */
export async function offlineUpdateRoomStatus(
  tenantId: string,
  roomId: string,
  payload: RoomStatusPayload
): Promise<BridgeResult<{ success: boolean; room?: any }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.updateRoomStatus) {
      console.log('[electronHousekeepingBridge] updateRoomStatus API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.updateRoomStatus(tenantId, roomId, payload);
    
    if (result?.success) {
      console.log('[electronHousekeepingBridge] Room status updated offline:', { roomId, status: payload.status });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline room status update failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineUpdateRoomStatus error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Create maintenance ticket via Electron offline API
 */
export async function offlineCreateMaintenanceTicket(
  tenantId: string,
  payload: MaintenanceTicketPayload
): Promise<BridgeResult<{ success: boolean; ticketId?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.createMaintenanceTicket) {
      console.log('[electronHousekeepingBridge] createMaintenanceTicket API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.createMaintenanceTicket(tenantId, payload);
    
    if (result?.success) {
      console.log('[electronHousekeepingBridge] Maintenance ticket created offline:', result.ticketId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline maintenance ticket creation failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineCreateMaintenanceTicket error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Update maintenance ticket via Electron offline API
 */
export async function offlineUpdateMaintenanceTicket(
  tenantId: string,
  ticketId: string,
  payload: { status?: string; note?: string; assignedTo?: string }
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.updateMaintenanceTicket) {
      console.log('[electronHousekeepingBridge] updateMaintenanceTicket API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.updateMaintenanceTicket(tenantId, ticketId, payload);
    
    if (result?.success) {
      console.log('[electronHousekeepingBridge] Maintenance ticket updated offline:', ticketId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline maintenance ticket update failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineUpdateMaintenanceTicket error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Create staff task via Electron offline API
 */
export async function offlineCreateTask(
  tenantId: string,
  payload: TaskPayload
): Promise<BridgeResult<{ success: boolean; taskId?: string }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.createTask) {
      console.log('[electronHousekeepingBridge] createTask API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.createTask(tenantId, payload);
    
    if (result?.success) {
      console.log('[electronHousekeepingBridge] Task created offline:', result.taskId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline task creation failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineCreateTask error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Update staff task via Electron offline API
 */
export async function offlineUpdateTask(
  tenantId: string,
  taskId: string,
  payload: { status?: string; note?: string; assignedTo?: string }
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.updateTask) {
      console.log('[electronHousekeepingBridge] updateTask API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.updateTask(tenantId, taskId, payload);
    
    if (result?.success) {
      console.log('[electronHousekeepingBridge] Task updated offline:', taskId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline task update failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineUpdateTask error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Complete staff task via Electron offline API
 */
export async function offlineCompleteTask(
  tenantId: string,
  taskId: string,
  payload: { completedBy: string; note?: string }
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.updateTask) {
      console.log('[electronHousekeepingBridge] completeTask API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.updateTask(tenantId, taskId, { 
      status: 'completed', 
      completedBy: payload.completedBy,
      note: payload.note 
    });
    
    if (result?.success) {
      console.log('[electronHousekeepingBridge] Task completed offline:', taskId);
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline task completion failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineCompleteTask error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Get housekeeping snapshot from Electron offline cache
 */
export async function offlineGetHousekeepingSnapshot(
  tenantId: string
): Promise<BridgeResult<{ rooms?: any[]; tasks?: any[]; tickets?: any[] }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.getSnapshot) {
      console.log('[electronHousekeepingBridge] getSnapshot API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    const result = await api.getSnapshot(tenantId);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineGetHousekeepingSnapshot error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Save housekeeping event to event journal
 */
export async function saveHousekeepingEvent(
  tenantId: string,
  event: HousekeepingEvent
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.offlineData;
    
    // Try dedicated housekeeping event API first
    if (api?.saveHousekeepingEvent) {
      await api.saveHousekeepingEvent(tenantId, event);
      console.log('[electronHousekeepingBridge] Housekeeping event saved:', event.type);
      return { data: { success: true }, error: null, source: 'offline' };
    }
    
    // Fallback to generic booking event API (stores in same journal)
    if (api?.saveBookingEvent) {
      await api.saveBookingEvent(tenantId, {
        type: event.type as any,
        bookingId: event.taskId || event.ticketId || 'housekeeping',
        roomId: event.roomId || 'n/a',
        timestamp: event.timestamp,
        payload: event.payload
      });
      console.log('[electronHousekeepingBridge] Housekeeping event saved via fallback:', event.type);
      return { data: { success: true }, error: null, source: 'offline' };
    }

    console.log('[electronHousekeepingBridge] No event journal API available');
    return { data: null, error: null, source: 'electron-no-api' };
  } catch (err) {
    console.error('[electronHousekeepingBridge] saveHousekeepingEvent error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Failed to save housekeeping event'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Update request status via Electron offline API (for staff requests/tasks)
 */
export async function offlineUpdateRequestStatus(
  tenantId: string,
  requestId: string,
  status: string
): Promise<BridgeResult<{ success: boolean }>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  try {
    const api = (window as any).electronAPI?.offlineApi?.housekeeping;
    
    if (!api?.updateTask) {
      console.log('[electronHousekeepingBridge] updateRequestStatus API not available');
      return { data: null, error: null, source: 'electron-no-api' };
    }

    // Use the task update API for request status updates
    const result = await api.updateTask(tenantId, requestId, { status });
    
    if (result?.success) {
      console.log('[electronHousekeepingBridge] Request status updated offline:', { requestId, status });
      return { data: result, error: null, source: 'offline' };
    }

    return { 
      data: null, 
      error: new Error(result?.error || 'Offline request status update failed'), 
      source: 'offline-error' 
    };
  } catch (err) {
    console.error('[electronHousekeepingBridge] offlineUpdateRequestStatus error:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown error'), 
      source: 'offline-error' 
    };
  }
}

/**
 * Check if offline housekeeping API is available
 */
export function isOfflineHousekeepingAvailable(): boolean {
  if (!isElectronContext()) return false;
  
  const api = (window as any).electronAPI?.offlineApi?.housekeeping;
  return !!(api?.updateRoomStatus || api?.createTask || api?.createMaintenanceTicket);
}
