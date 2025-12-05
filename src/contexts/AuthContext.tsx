import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isElectronContext } from '@/lib/environment/isElectron';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  tenantId: string | null;
  tenantName: string | null;
  role: string | null;
  platformRole: string | null;
  department: string | null;
  passwordResetRequired: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  // Guest mode properties (for QR portal)
  isGuestMode: boolean;
  guestId: string | null;
  qrToken: string | null;
  setGuestMode: (token: string, guestId: string, tenantId: string) => void;
  clearGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [passwordResetRequired, setPasswordResetRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Guest mode state (for QR portal)
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  // Checkout reminder scheduler - runs daily at 10 AM
  // Non-blocking: errors are logged but don't disrupt auth
  useEffect(() => {
    if (!tenantId) return;

    const sendReminders = async (hoursBefore: number) => {
      try {
        const { data, error } = await supabase.functions.invoke('send-checkout-reminder', {
          body: {
            tenant_id: tenantId,
            hours_before: hoursBefore,
          },
        });

        if (error) {
          // Log but don't disrupt app - this is non-critical
          console.warn(`[AuthContext] Checkout reminder ${hoursBefore}h failed (non-blocking):`, error.message);
        } else {
          console.log(`[AuthContext] Sent ${hoursBefore}h checkout reminders:`, data);
        }
      } catch (err) {
        // Silent failure - don't crash auth or show toasts
        console.warn(`[AuthContext] Checkout reminder ${hoursBefore}h exception (non-blocking):`, err);
      }
    };

    const now = new Date();
    
    // Schedule for 10 AM daily
    const next24h = new Date(now);
    next24h.setHours(10, 0, 0, 0);
    if (now > next24h) {
      next24h.setDate(next24h.getDate() + 1);
    }
    const ms24h = next24h.getTime() - now.getTime();

    const next2h = new Date(now);
    next2h.setHours(10, 0, 0, 0);
    if (now > next2h) {
      next2h.setDate(next2h.getDate() + 1);
    }
    const ms2h = next2h.getTime() - now.getTime();

    // Schedule 24h reminders
    const timer24h = setTimeout(() => {
      sendReminders(24);
      const interval24h = setInterval(() => sendReminders(24), 24 * 60 * 60 * 1000);
      return () => clearInterval(interval24h);
    }, ms24h);

    // Schedule 2h reminders
    const timer2h = setTimeout(() => {
      sendReminders(2);
      const interval2h = setInterval(() => sendReminders(2), 24 * 60 * 60 * 1000);
      return () => clearInterval(interval2h);
    }, ms2h);

    console.log(`[AuthContext] Checkout reminders scheduled: 24h in ${Math.round(ms24h / 1000 / 60)} min, 2h in ${Math.round(ms2h / 1000 / 60)} min`);

    return () => {
      clearTimeout(timer24h);
      clearTimeout(timer2h);
    };
  }, [tenantId]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
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

  // Auto-checkout disabled - Front desk must manually process checkouts

  const fetchPlatformRole = async (userId: string) => {
    try {
      // Using any to bypass TypeScript complexity with platform_users table
      const { data, error } = await (supabase as any)
        .from('platform_users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching platform role:', error);
      }

      setPlatformRole(data?.role || null);
    } catch (err) {
      console.error('Failed to fetch platform role:', err);
      setPlatformRole(null);
    }
  };

  const fetchUserRoleAndTenant = async (userId: string) => {
    try {
      // Fetch platform role first
      await fetchPlatformRole(userId);
      
      // Try to fetch tenant role (may be null for platform admins)
      const { data, error } = await supabase
        .from('user_roles')
        .select('tenant_id, role, tenants(name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tenant role:', error);
      }

      // Set tenant info (may be null for platform-only users)
      setTenantId(data?.tenant_id || null);
      setRole(data?.role || null);
      setTenantName((data?.tenants as any)?.name || null);
      
      // Fetch staff information only if tenant exists
      if (data?.tenant_id) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('department, password_reset_required')
          .eq('user_id', userId)
          .eq('tenant_id', data.tenant_id)
          .maybeSingle();
        
        if (staffData) {
          setDepartment(staffData.department);
          setPasswordResetRequired(staffData.password_reset_required || false);
        }
      }

      // Phase 14: Save session state to Electron offline cache
      if (isElectronContext()) {
        const api = (window as any).electronAPI;
        if (api?.offlineApi?.offlineData?.saveSessionState) {
          api.offlineApi.offlineData.saveSessionState(userId, {
            userId,
            tenantId: data?.tenant_id || null,
            role: data?.role || null,
            platformRole,
            department: null, // Will be updated below if staff data fetched
            tenantName: (data?.tenants as any)?.name || null,
            timestamp: new Date().toISOString(),
          }).catch((e: any) => {
            console.warn('[AuthContext] Failed to cache session state:', e);
          });
        }
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
    setPlatformRole(null);
    setDepartment(null);
    setPasswordResetRequired(false);
    clearGuestMode();
  };

  const setGuestMode = (token: string, guestIdValue: string, tenantIdValue: string) => {
    setIsGuestMode(true);
    setQrToken(token);
    setGuestId(guestIdValue);
    setTenantId(tenantIdValue);
    setLoading(false);
  };

  const clearGuestMode = () => {
    setIsGuestMode(false);
    setQrToken(null);
    setGuestId(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      tenantId, 
      tenantName, 
      role, 
      platformRole, 
      department, 
      passwordResetRequired, 
      loading, 
      signOut,
      isGuestMode,
      guestId,
      qrToken,
      setGuestMode,
      clearGuestMode
    }}>
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
