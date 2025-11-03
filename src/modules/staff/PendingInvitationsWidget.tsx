import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { Mail, Clock, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function PendingInvitationsWidget() {
  const { invitations, isLoading, error, resendInvitation, cancelInvitation } = useStaffInvitations();

  console.log('[PendingInvitationsWidget] Render:', { 
    invitations, 
    isLoading, 
    error,
    invitationsLength: invitations?.length 
  });

  const pendingInvitations = invitations?.filter(
    inv => inv.status === 'pending' && new Date(inv.expires_at) > new Date()
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('[PendingInvitationsWidget] Error state:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Invitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load pending invitations'}
          </p>
          <p className="text-xs text-muted-foreground">
            Check console for detailed error information
          </p>
        </CardContent>
      </Card>
    );
  }

  if (pendingInvitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>No pending staff invitations</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            All invitations have been accepted or expired
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations ({pendingInvitations.length})
        </CardTitle>
        <CardDescription>
          Staff members who haven't accepted their invitation yet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingInvitations.map((invitation) => {
          const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), {
            addSuffix: true,
          });

          return (
            <div
              key={invitation.id}
              className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{invitation.full_name}</h4>
                  <Badge variant="secondary" className="shrink-0">
                    {invitation.role?.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate mb-1">
                  {invitation.email}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires {expiresIn}
                  </span>
                  <span className="capitalize">
                    {invitation.department?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resendInvitation.mutate(invitation.id)}
                  disabled={resendInvitation.isPending}
                  title="Resend invitation"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => cancelInvitation.mutate(invitation.id)}
                  disabled={cancelInvitation.isPending}
                  title="Cancel invitation"
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
