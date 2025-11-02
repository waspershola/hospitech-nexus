import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PasswordChangeRequired() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if password change is actually required
    const checkPasswordStatus = async () => {
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const { data: staff } = await supabase
        .from('staff')
        .select('password_reset_required')
        .eq('user_id', user.id)
        .single();

      if (!staff?.password_reset_required) {
        // Password change not required, redirect to dashboard
        navigate('/dashboard');
      } else {
        setLoading(false);
      }
    };

    checkPasswordStatus();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Clear password_reset_required flag
      const { error: staffError } = await supabase
        .from('staff')
        .update({ password_reset_required: false })
        .eq('user_id', user!.id);

      if (staffError) throw staffError;

      toast.success('Password updated successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-12 w-12 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Password Change Required</CardTitle>
          <CardDescription>
            For security reasons, you must change your temporary password before continuing
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              <strong>Security Notice:</strong> Create a strong password that you haven't used before.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Password Requirements:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${newPassword.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`} />
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${newPassword === confirmPassword && newPassword.length > 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
                  Passwords match
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Change Password & Continue'
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            You cannot access the system until you change your password
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
