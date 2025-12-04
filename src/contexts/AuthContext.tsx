import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from '@/lib/offline/sessionManager';

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

// AUTH-FIX-V1: Maximum loading time before forcing completion
const MAX_LOADING_TIME_MS = 10000;

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
  
  // AUTH-FIX-V1: Track if we've already processed initial session
  const initialSessionProcessed = useRef(false);
  
  // Guest mode state (for QR portal)
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  // AUTH-FIX-V1: Safety timeout to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[AuthContext] AUTH-FIX-V1: Loading timeout reached, forcing loading=false');
        setLoading(false);
      }
    }, MAX_LOADING_TIME_MS);
    
    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  // Checkout reminder scheduler - runs daily at 10 AM
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
          console.error(`Error sending ${hoursBefore}h reminders:`, error);
        } else {
          console.log(`Sent ${hoursBefore}h checkout reminders:`, data);
        }
      } catch (err) {
        console.error(`Failed to send ${hoursBefore}h reminders:`, err);
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

    console.log(`Checkout reminders scheduled: 24h in ${Math.round(ms24h / 1000 / 60)} min, 2h in ${Math.round(ms2h / 1000 / 60)} min`);

    return () => {
      clearTimeout(timer24h);
      clearTimeout(timer2h);
    };
  }, [tenantId]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] AUTH-FIX-V1: Auth state change:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Initialize offline sessionManager for edge function calls
        if (session?.user) {
          // AUTH-FIX-V1: Use setTimeout to prevent blocking
          setTimeout(() => {
            fetchUserRoleAndTenant(session.user.id);
            
            // Initialize sessionManager with current session for offline support
            if (session.access_token && session.refresh_token) {
              sessionManager.setSession(
                '', // tenantId will be set in fetchUserRoleAndTenant
                session.user.id,
                session.access_token,
                session.refresh_token,
                [], // roles will be determined in fetchUserRoleAndTenant
                session.expires_in || 3600
              ).catch(err => console.error('[SessionManager] Init failed:', err));
            }
          }, 0);
        } else {
          // AUTH-FIX-V1: Immediately set loading false when no user
          setTenantId(null);
          setRole(null);
          setPlatformRole(null);
          setDepartment(null);
          setLoading(false);
          sessionManager.clearSession().catch(err => console.error('[SessionManager] Clear failed:', err));
        }
      }
    );

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        console.log('[AuthContext] AUTH-FIX-V1: Checking existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] AUTH-FIX-V1: Session error:', error);
          setLoading(false);
          return;
        }
        
        // AUTH-FIX-V1: Prevent duplicate processing
        if (initialSessionProcessed.current) {
          console.log('[AuthContext] AUTH-FIX-V1: Session already processed, skipping');
          return;
        }
        initialSessionProcessed.current = true;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('[AuthContext] AUTH-FIX-V1: Valid session found for:', session.user.email);
          await fetchUserRoleAndTenant(session.user.id);
          
          // Initialize sessionManager for existing session
          if (session.access_token && session.refresh_token) {
            sessionManager.setSession(
              '', // tenantId will be set in fetchUserRoleAndTenant
              session.user.id,
              session.access_token,
              session.refresh_token,
              [], // roles will be determined in fetchUserRoleAndTenant
              session.expires_in || 3600
            ).catch(err => console.error('[SessionManager] Init failed:', err));
          }
        } else {
          console.log('[AuthContext] AUTH-FIX-V1: No existing session');
          setLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext] AUTH-FIX-V1: Session init error:', err);
        setLoading(false);
      }
    };
    
    initializeSession();

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
      console.log('[AuthContext] AUTH-FIX-V1: Fetching user role for:', userId);
      
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
      
      console.log('[AuthContext] AUTH-FIX-V1: User context set:', {
        tenantId: data?.tenant_id,
        role: data?.role
      });
      
      // Fetch staff information only if tenant exists
      if (data?.tenant_id) {
        try {
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
          
          // Update sessionManager with tenant and role info for offline edge function support
          const currentSession = await supabase.auth.getSession();
          if (currentSession.data.session && data.tenant_id) {
            await sessionManager.setSession(
              data.tenant_id,
              userId,
              currentSession.data.session.access_token,
              currentSession.data.session.refresh_token,
              data.role ? [data.role] : [],
              currentSession.data.session.expires_in || 3600
            );
            console.log('[SessionManager] Initialized for tenant:', data.tenant_id);
          }
        } catch (staffErr) {
          console.error('[AuthContext] AUTH-FIX-V1: Staff fetch error:', staffErr);
        }
      }
    } catch (error) {
      console.error('[AuthContext] AUTH-FIX-V1: Error fetching user role:', error);
    } finally {
      // AUTH-FIX-V1: Always set loading to false
      console.log('[AuthContext] AUTH-FIX-V1: Setting loading=false');
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] AUTH-FIX-V1: Signing out...');
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
    
    // AUTH-FIX-V1: Reset session processed flag for fresh login
    initialSessionProcessed.current = false;
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
