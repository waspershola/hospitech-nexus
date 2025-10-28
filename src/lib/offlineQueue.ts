import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineAction {
  action_id: string;
  type: 'booking' | 'payment' | 'room_status';
  payload: Record<string, any>;
  created_at: string;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}

interface OfflineDB extends DBSchema {
  actions: {
    key: string;
    value: OfflineAction;
    indexes: { 'by-status': string; 'by-date': string };
  };
}

const DB_NAME = 'luxury-hotel-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

export async function initOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('actions', { keyPath: 'action_id' });
      store.createIndex('by-status', 'status');
      store.createIndex('by-date', 'created_at');
    },
  });

  return dbInstance;
}

export async function queueAction(action: Omit<OfflineAction, 'created_at' | 'status'>): Promise<void> {
  const db = await initOfflineDB();
  await db.put('actions', {
    ...action,
    created_at: new Date().toISOString(),
    status: 'pending',
  });
}

export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await initOfflineDB();
  return db.getAllFromIndex('actions', 'by-status', 'pending');
}

export async function markActionSynced(actionId: string): Promise<void> {
  const db = await initOfflineDB();
  const action = await db.get('actions', actionId);
  if (action) {
    action.status = 'synced';
    await db.put('actions', action);
  }
}

export async function markActionFailed(actionId: string, error: string): Promise<void> {
  const db = await initOfflineDB();
  const action = await db.get('actions', actionId);
  if (action) {
    action.status = 'failed';
    action.error = error;
    await db.put('actions', action);
  }
}

export async function clearSyncedActions(): Promise<void> {
  const db = await initOfflineDB();
  const syncedActions = await db.getAllFromIndex('actions', 'by-status', 'synced');
  const tx = db.transaction('actions', 'readwrite');
  await Promise.all([
    ...syncedActions.map(action => tx.store.delete(action.action_id)),
    tx.done,
  ]);
}

export async function syncQueue(): Promise<{ success: number; failed: number }> {
  const pendingActions = await getPendingActions();
  let success = 0;
  let failed = 0;

  for (const action of pendingActions) {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(action),
      });

      if (response.ok) {
        await markActionSynced(action.action_id);
        success++;
      } else {
        const error = await response.text();
        await markActionFailed(action.action_id, error);
        failed++;
      }
    } catch (error) {
      await markActionFailed(action.action_id, error instanceof Error ? error.message : 'Unknown error');
      failed++;
    }
  }

  // Clean up synced actions older than 7 days
  await clearSyncedActions();

  return { success, failed };
}
