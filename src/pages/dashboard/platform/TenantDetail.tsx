import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, Users, Package, Settings, Activity, CreditCard, HeadphonesIcon } from 'lucide-react';
import TenantDetailOverview from '@/components/platform/TenantDetailOverview';
import TenantDetailUsers from '@/components/platform/TenantDetailUsers';
import TenantDetailPackage from '@/components/platform/TenantDetailPackage';
import TenantDetailSettings from '@/components/platform/TenantDetailSettings';

export default function TenantDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['platform-tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_tenants')
        .select('*, plan:platform_plans(*)')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      // Fetch owner info
      const { data: ownerRole } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
        .maybeSingle();

      if (ownerRole?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', ownerRole.user_id)
          .maybeSingle();

        return {
          ...data,
          owner_email: profile?.email,
          owner_name: profile?.full_name
        };
      }

      return data;
    },
    enabled: !!tenantId
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive',
      trial: 'outline'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Tenant not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard/platform')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{tenant.domain || tenant.owner_email}</h1>
              {getStatusBadge(tenant.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {tenant.owner_email} • Created {new Date(tenant.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="package">
            <Package className="h-4 w-4 mr-2" />
            Package & Addons
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="support">
            <HeadphonesIcon className="h-4 w-4 mr-2" />
            Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TenantDetailOverview tenant={tenant} />
        </TabsContent>

        <TabsContent value="users">
          <TenantDetailUsers tenantId={tenantId!} />
        </TabsContent>

        <TabsContent value="package">
          <TenantDetailPackage tenant={tenant} />
        </TabsContent>

        <TabsContent value="settings">
          <TenantDetailSettings tenant={tenant} />
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Invoices and payment history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent actions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
              <CardDescription>Support tickets and communications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
