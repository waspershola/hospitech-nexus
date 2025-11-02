import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { autoCompleteOverdueBookings, syncRoomStatusFromBookings } from '@/lib/roomStatusSync';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  tenantId: string | null;
  tenantName: string | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoleAndTenant(session.user.id);
          }, 0);
        } else {
          setTenantId(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoleAndTenant(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Phase 7: Daily background sync at midnight
  useEffect(() => {
    if (!tenantId) return;

    console.log('[Background Sync] Setting up daily sync scheduler');
    
    // Calculate time until next midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    console.log(`[Background Sync] Next sync in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
    
    // Run at midnight
    const midnightTimer = setTimeout(() => {
      console.log('[Background Sync] Running midnight sync...');
      
      // Auto-complete overdue bookings
      autoCompleteOverdueBookings(tenantId).then((result) => {
        if (result.completed > 0) {
          console.log(`[Midnight Sync] Completed ${result.completed} overdue bookings`);
        }
      }).catch(err => {
        console.error('[Midnight Sync] Error auto-completing:', err);
      });

      // Sync room statuses
      syncRoomStatusFromBookings(tenantId).then((result) => {
        if (result.synced > 0) {
          console.log(`[Midnight Sync] Synced ${result.synced} room statuses`);
        }
      }).catch(err => {
        console.error('[Midnight Sync] Error syncing rooms:', err);
      });
      
      // Then run every 24 hours
      const dailyInterval = setInterval(() => {
        console.log('[Daily Sync] Running scheduled sync...');
        
        autoCompleteOverdueBookings(tenantId);
        syncRoomStatusFromBookings(tenantId);
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);
    
    return () => {
      console.log('[Background Sync] Cleaning up sync scheduler');
      clearTimeout(midnightTimer);
    };
  }, [tenantId]);

  const fetchUserRoleAndTenant = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('tenant_id, role, tenants(name)')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setTenantId(data?.tenant_id || null);
      setRole(data?.role || null);
      setTenantName((data?.tenants as any)?.name || null);
      
      // Auto-complete overdue bookings and sync room statuses when user logs in
      if (data?.tenant_id) {
        // Run both sync operations
        autoCompleteOverdueBookings(data.tenant_id).then((result) => {
          if (result.completed > 0) {
            console.log(`[Auto-Complete] Completed ${result.completed} overdue bookings`);
          }
        }).catch(err => {
          console.error('Error auto-completing overdue bookings:', err);
        });

        syncRoomStatusFromBookings(data.tenant_id).then((result) => {
          if (result.synced > 0) {
            console.log(`[Room Sync] Synced ${result.synced} room statuses`);
          }
        }).catch(err => {
          console.error('Error syncing room statuses:', err);
        });
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setTenantId(null);
    setTenantName(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, tenantId, tenantName, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}