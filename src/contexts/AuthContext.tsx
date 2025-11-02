import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { autoCompleteOverdueBookings } from '@/lib/roomStatusSync';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  tenantId: string | null;
  tenantName: string | null;
  role: string | null;
  department: string | null;
  passwordResetRequired: boolean;
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
  const [department, setDepartment] = useState<string | null>(null);
  const [passwordResetRequired, setPasswordResetRequired] = useState(false);
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

  // Daily background sync at midnight for overdue bookings
  useEffect(() => {
    if (!tenantId) return;

    console.log('[Background Sync] Setting up daily booking cleanup scheduler');
    
    // Calculate time until next midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    console.log(`[Background Sync] Next cleanup in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
    
    // Run at midnight
    const midnightTimer = setTimeout(() => {
      console.log('[Background Sync] Running midnight cleanup...');
      
      // Auto-complete overdue bookings
      autoCompleteOverdueBookings(tenantId).then((result) => {
        if (result.completed > 0) {
          console.log(`[Midnight Sync] Completed ${result.completed} overdue bookings`);
        }
      }).catch(err => {
        console.error('[Midnight Sync] Error auto-completing:', err);
      });
      
      // Then run every 24 hours
      const dailyInterval = setInterval(() => {
        console.log('[Daily Sync] Running scheduled cleanup...');
        autoCompleteOverdueBookings(tenantId);
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);
    
    return () => {
      console.log('[Background Sync] Cleaning up scheduler');
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
      
      // Fetch staff information if available
      if (data?.tenant_id) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('department, password_reset_required')
          .eq('user_id', userId)
          .eq('tenant_id', data.tenant_id)
          .single();
        
        if (staffData) {
          setDepartment(staffData.department);
          setPasswordResetRequired(staffData.password_reset_required || false);
        }
        
        // Auto-complete overdue bookings when user logs in
        autoCompleteOverdueBookings(data.tenant_id).then((result) => {
          if (result.completed > 0) {
            console.log(`[Auto-Complete] Completed ${result.completed} overdue bookings`);
          }
        }).catch(err => {
          console.error('Error auto-completing overdue bookings:', err);
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
    setDepartment(null);
    setPasswordResetRequired(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, tenantId, tenantName, role, department, passwordResetRequired, loading, signOut }}>
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