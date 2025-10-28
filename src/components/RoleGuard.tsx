import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offWhite px-4">
        <div className="text-center">
          <h1 className="text-4xl font-display text-charcoal mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}