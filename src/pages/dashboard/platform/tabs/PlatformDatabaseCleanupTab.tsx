import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface OrphanedTenant {
  id: string;
  name: string;
  created_at: string;
  owner_email: string | null;
}

export function PlatformDatabaseCleanupTab() {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<OrphanedTenant | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch orphaned tenants (tenants without owner users)
  const { data: orphanedTenants, isLoading, refetch } = useQuery({
    queryKey: ['orphaned-tenants'],
    queryFn: async () => {
      // Get all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, created_at');

      if (tenantsError) throw tenantsError;

      // Get platform tenants to get owner emails
      const { data: platformTenants, error: platformError } = await supabase
        .from('platform_tenants')
        .select('id, owner_email');

      if (platformError) throw platformError;

      // Get all user roles with owner role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('tenant_id, user_id')
        .eq('role', 'owner');

      if (rolesError) throw rolesError;

      // Find tenants without owner user_roles
      const orphaned: OrphanedTenant[] = tenants
        .filter(tenant => !userRoles.some(role => role.tenant_id === tenant.id))
        .map(tenant => ({
          ...tenant,
          owner_email: platformTenants.find(pt => pt.id === tenant.id)?.owner_email || null,
        }));

      return orphaned;
    },
  });

  const deleteTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      // Delete from platform_tenants
      const { error: platformError } = await supabase
        .from('platform_tenants')
        .delete()
        .eq('id', tenantId);

      if (platformError) throw platformError;

      // Delete from tenants
      const { error: tenantError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (tenantError) throw tenantError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orphaned-tenants'] });
      toast.success('Orphaned tenant deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
    },
  });

  const handleDeleteClick = (tenant: OrphanedTenant) => {
    setSelectedTenant(tenant);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedTenant) {
      deleteTenant.mutate(selectedTenant.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Scanning database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Database Cleanup</h2>
          <p className="text-muted-foreground">Identify and remove orphaned tenants without owner users</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <Search className="h-4 w-4 mr-2" />
          Scan Again
        </Button>
      </div>

      {orphanedTenants && orphanedTenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Database is clean</h3>
            <p className="text-muted-foreground text-center">
              No orphaned tenants found. All tenants have associated owner users.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Orphaned Tenants Found
              </CardTitle>
              <CardDescription>
                {orphanedTenants?.length} tenant(s) without owner users detected. These were likely created when user creation failed.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {orphanedTenants?.map((tenant) => (
              <Card key={tenant.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle>{tenant.name || 'Unnamed Tenant'}</CardTitle>
                        <Badge variant="destructive">Orphaned</Badge>
                      </div>
                      <CardDescription className="space-y-1">
                        {tenant.owner_email && <div>Owner Email: {tenant.owner_email}</div>}
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(tenant.created_at).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tenant ID: {tenant.id}
                        </div>
                      </CardDescription>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(tenant)}
                      disabled={deleteTenant.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orphaned Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tenant "{selectedTenant?.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
