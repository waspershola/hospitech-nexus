import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantAccess } from '@/hooks/useTenantAccess';

// AUTH-FIX-V1: Maximum time to wait for loading before forcing redirect
const MAX_LOADING_WAIT_MS = 15000;

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Check if user needs to reset password
  useEffect(() => {
    if (user && (user.user_metadata?.force_password_reset || user.user_metadata?.requires_password_change)) {
      navigate('/force-password-reset', { replace: true });
    }
  }, [user, navigate]);

  // Check tenant access (suspension)
  useTenantAccess();

  // AUTH-FIX-V1: Loading timeout fallback
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('[ProtectedRoute] AUTH-FIX-V1: Loading timeout reached');
        setLoadingTimeout(true);
      }, MAX_LOADING_WAIT_MS);
      return () => clearTimeout(timer);
    } else {
      // Reset timeout state when loading completes normally
      setLoadingTimeout(false);
    }
  }, [loading]);

  // AUTH-FIX-V1: Handle loading timeout - force logout and redirect
  useEffect(() => {
    if (loadingTimeout && loading) {
      console.warn('[ProtectedRoute] AUTH-FIX-V1: Forcing logout due to loading timeout');
      signOut().then(() => {
        navigate('/auth/login', { replace: true });
      });
    }
  }, [loadingTimeout, loading, signOut, navigate]);

  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offWhite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}
