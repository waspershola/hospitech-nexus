import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenantLifecycle } from '@/hooks/useTenantLifecycle';
import { TenantLifecycleTable } from '@/components/platform/TenantLifecycleTable';
import { TenantLifecycleStats } from '@/components/platform/TenantLifecycleStats';
import { RefreshCw } from 'lucide-react';

export default function Tenants() {
  const {
    tenants,
    lifecycleStats,
    isLoading,
    activateTenant,
    suspendTenant,
    deactivateTenant,
  } = useTenantLifecycle();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage tenant lifecycle and onboarding
          </p>
        </div>
      </div>

      {lifecycleStats && <TenantLifecycleStats stats={lifecycleStats} />}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tenants</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Tenants</CardTitle>
              <CardDescription>
                Complete list of all registered tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TenantLifecycleTable
                tenants={(tenants || []) as any}
                onActivate={(id) => activateTenant.mutate(id)}
                onSuspend={(id) => suspendTenant.mutate({ tenantId: id })}
                onDeactivate={(id) => deactivateTenant.mutate(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Tenants</CardTitle>
              <CardDescription>
                Tenants with active subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TenantLifecycleTable
                tenants={(tenants?.filter((t: any) => t.status === 'active') || []) as any}
                onSuspend={(id) => suspendTenant.mutate({ tenantId: id })}
                onDeactivate={(id) => deactivateTenant.mutate(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Tenants</CardTitle>
              <CardDescription>
                Tenants awaiting activation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TenantLifecycleTable
                tenants={(tenants?.filter((t: any) => t.status === 'pending') || []) as any}
                onActivate={(id) => activateTenant.mutate(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenants with Issues</CardTitle>
              <CardDescription>
                Suspended or inactive tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TenantLifecycleTable
                tenants={
                  (tenants?.filter((t: any) => ['suspended', 'inactive'].includes(t.status)) || []) as any
                }
                onActivate={(id) => activateTenant.mutate(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
