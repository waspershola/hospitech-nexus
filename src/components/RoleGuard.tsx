import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
}

/**
 * @security UI-ONLY AUTHORIZATION - This component ONLY controls UI visibility.
 * 
 * CRITICAL SECURITY WARNING:
 * - This component provides NO server-side security
 * - It only hides/shows UI elements for better user experience
 * - Backend operations MUST verify roles server-side using has_role() function
 * - Never rely on this component alone for authorization decisions
 * - All sensitive operations need explicit server-side role verification in edge functions
 * 
 * Best Practices:
 * 1. Always implement server-side authorization in edge functions
 * 2. Use RLS policies with has_role() for database operations
 * 3. Treat this component as a UX enhancement, not a security control
 * 4. Assume client-side code can be bypassed or manipulated
 * 
 * @example
 * // ✅ CORRECT - Server-side check in edge function
 * const { data: userRole } = await supabase
 *   .from('user_roles')
 *   .select('role')
 *   .eq('user_id', user.id)
 *   .single();
 * if (userRole.role !== 'owner' && userRole.role !== 'manager') {
 *   throw new Error('Insufficient permissions');
 * }
 * 
 * // ❌ WRONG - Relying only on RoleGuard
 * <RoleGuard allowedRoles={['owner', 'manager']}>
 *   <SensitiveOperation />
 * </RoleGuard>
 */
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