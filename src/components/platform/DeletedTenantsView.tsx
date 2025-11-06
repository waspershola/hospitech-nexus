import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw } from 'lucide-react';
import { useSoftDelete } from '@/hooks/useSoftDelete';
import { toast } from 'sonner';

export default function DeletedTenantsView() {
  const { restoreTenant } = useSoftDelete();

  const { data: deletedTenants, isLoading } = useQuery({
    queryKey: ['deleted-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_tenants')
        .select('*, plan:platform_plans(*)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      // Fetch deleted by info
      const tenantsWithDeletedBy = await Promise.all(
        (data || []).map(async (tenant) => {
          if (tenant.deleted_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', tenant.deleted_by)
              .maybeSingle();

            return {
              ...tenant,
              deleted_by_profile: profile
            };
          }
          return tenant;
        })
      );

      return tenantsWithDeletedBy;
    }
  });

  const handleRestore = (tenantId: string) => {
    restoreTenant.mutate(tenantId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Deleted Tenants
        </CardTitle>
        <CardDescription>
          Tenants that have been moved to trash. They can be restored if needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!deletedTenants || deletedTenants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No deleted tenants
          </div>
        ) : (
          <div className="space-y-4">
            {deletedTenants.map((tenant: any) => (
              <div
                key={tenant.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{tenant.domain || tenant.owner_email}</p>
                    <Badge variant="outline">Deleted</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Owner: {tenant.owner_email}
                  </p>
                  {tenant.plan && (
                    <p className="text-sm text-muted-foreground">
                      Plan: {tenant.plan.name}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <p>
                      Deleted: {new Date(tenant.deleted_at).toLocaleString()}
                    </p>
                    {tenant.deleted_by_profile && (
                      <p>
                        Deleted by: {tenant.deleted_by_profile.full_name || tenant.deleted_by_profile.email}
                      </p>
                    )}
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restore Tenant?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will restore the tenant account and all associated data.
                        The tenant owner will be able to log in again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRestore(tenant.id)}>
                        Restore Tenant
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
