import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Hotel } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user needs to reset password and get role info
      const { data: staffData } = await supabase
        .from('staff')
        .select('password_reset_required, department, role')
        .eq('user_id', authData.user.id)
        .single();

      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (staffData?.password_reset_required) {
        navigate('/auth/password-change');
        return;
      }

      // Role and department-based redirect using the new helper
      const getDefaultDashboard = (role: string, department?: string): string => {
        const dashboardMap: Record<string, string> = {
          owner: '/dashboard',
          manager: '/dashboard',
          frontdesk: '/dashboard/front-desk',
          housekeeping: '/dashboard/housekeeping-dashboard',
          finance: '/dashboard/finance-dashboard',
          accountant: '/dashboard/finance-center',
          restaurant: '/dashboard/kitchen-dashboard',
          bar: '/dashboard/bar-dashboard',
          maintenance: '/dashboard/maintenance-dashboard',
        };

        if (role === 'supervisor' && department) {
          const supervisorDashboards: Record<string, string> = {
            front_office: '/dashboard/front-desk',
            housekeeping: '/dashboard/housekeeping-dashboard',
            food_beverage: '/dashboard/kitchen-dashboard',
            kitchen: '/dashboard/kitchen-dashboard',
            bar: '/dashboard/bar-dashboard',
            maintenance: '/dashboard/maintenance-dashboard',
            accounts: '/dashboard/finance-dashboard',
          };
          return supervisorDashboards[department] || '/dashboard';
        }

        return dashboardMap[role] || '/dashboard';
      };

      const redirectPath = userRoleData?.role 
        ? getDefaultDashboard(userRoleData.role, staffData?.department || undefined)
        : '/dashboard';

      toast({
        title: `Welcome back!`,
        description: 'Successfully signed in.',
      });
      
      navigate(redirectPath);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-offWhite px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Hotel className="w-10 h-10 text-accent" />
            <h1 className="text-3xl font-display text-charcoal">LuxuryHotelPro</h1>
          </div>
          <p className="text-muted-foreground">Sign in to your dashboard</p>
        </div>

        <div className="bg-cardWhite rounded-2xl shadow-luxury p-8 border border-border">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="gold"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/auth/signup" className="text-accent hover:text-accent/80 font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}