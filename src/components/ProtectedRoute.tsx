import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantAccess } from '@/hooks/useTenantAccess';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Check if user needs to reset password
  useEffect(() => {
    if (user && user.user_metadata?.force_password_reset) {
      navigate('/force-password-reset', { replace: true });
    }
  }, [user, navigate]);

  // Check tenant access (suspension)
  useTenantAccess();

  if (loading) {
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