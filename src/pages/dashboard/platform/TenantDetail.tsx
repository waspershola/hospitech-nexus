import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, Users, Package, Settings, Activity, CreditCard, HeadphonesIcon, PauseCircle, PlayCircle } from 'lucide-react';
import TenantDetailOverview from '@/components/platform/TenantDetailOverview';
import TenantDetailUsers from '@/components/platform/TenantDetailUsers';
import TenantDetailPackage from '@/components/platform/TenantDetailPackage';
import TenantDetailSettings from '@/components/platform/TenantDetailSettings';
import TenantDetailActivity from '@/components/platform/TenantDetailActivity';
import TenantDetailBilling from '@/components/platform/TenantDetailBilling';
import TenantDetailAddons from '@/components/platform/TenantDetailAddons';
import TenantDetailSupport from '@/components/platform/TenantDetailSupport';
import SuspendTenantDialog from '@/components/platform/SuspendTenantDialog';
import { usePlatformTenants } from '@/hooks/usePlatformTenants';

export default function TenantDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { activateTenant } = usePlatformTenants();

  // Handle tab query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { data: tenant, isLoading, error: queryError } = useQuery({
    queryKey: ['platform-tenant', tenantId],
    queryFn: async () => {
      console.log('[TenantDetail] Fetching tenant:', tenantId);
      
      // Fetch tenant data without relationship syntax
      const { data, error } = await supabase
        .from('platform_tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('[TenantDetail] Error fetching tenant:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      if (!data) {
        console.warn('[TenantDetail] Tenant not found:', tenantId);
        return null;
      }

      console.log('[TenantDetail] Tenant data loaded:', data.domain || data.id);

      // Fetch plan data separately
      let planData = null;
      if (data.plan_id) {
        const { data: plan, error: planError } = await supabase
          .from('platform_plans')
          .select('*')
          .eq('id', data.plan_id)
          .maybeSingle();

        if (planError) {
          console.error('[TenantDetail] Error fetching plan:', planError);
        } else {
          planData = plan;
        }
      }

      // Fetch owner info
      const { data: ownerRole, error: ownerError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('role', 'owner')
        .maybeSingle();

      if (ownerError) {
        console.error('[TenantDetail] Error fetching owner role:', ownerError);
      }

      let ownerEmail = null;
      let ownerName = null;

      if (ownerRole?.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', ownerRole.user_id)
          .maybeSingle();

        if (profileError) {
          console.error('[TenantDetail] Error fetching profile:', profileError);
        } else if (profile) {
          ownerEmail = profile.email;
          ownerName = profile.full_name;
        }
      }

      return {
        ...data,
        plan: planData,
        owner_email: ownerEmail,
        owner_name: ownerName
      };
    },
    enabled: !!tenantId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!tenant) {
    const errorDetails = queryError ? {
      message: (queryError as any).message || 'Unknown error',
      code: (queryError as any).code,
      details: (queryError as any).details
    } : null;

    console.error('[TenantDetail] Failed to load tenant:', { queryError, errorDetails, tenantId });

    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Tenant Details</CardTitle>
            <CardDescription>
              {queryError 
                ? 'There was an error loading the tenant. This could be due to permissions or a network issue.' 
                : 'Tenant not found. It may have been deleted or you may not have access.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorDetails && (
              <div className="bg-muted p-3 rounded text-sm space-y-1">
                <p><strong>Error:</strong> {errorDetails.message}</p>
                {errorDetails.code && <p><strong>Code:</strong> {errorDetails.code}</p>}
                {errorDetails.details && <p><strong>Details:</strong> {errorDetails.details}</p>}
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/platform-admin?tab=tenants')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tenants
            </Button>
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
            onClick={() => navigate('/dashboard/platform-admin?tab=tenants')}
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

        <div className="flex gap-2">
          {tenant.status === 'suspended' ? (
            <Button
              variant="outline"
              onClick={() => activateTenant.mutate(tenant.id)}
              disabled={activateTenant.isPending}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Reactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(true)}
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Suspension Reason Display */}
      {tenant.status === 'suspended' && tenant.suspension_reason && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <PauseCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Suspension Reason</p>
                <p className="text-sm text-muted-foreground mt-1">{tenant.suspension_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
          <div className="space-y-6">
            <TenantDetailPackage tenant={tenant} />
            <TenantDetailAddons tenant={tenant} />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <TenantDetailSettings tenant={tenant} />
        </TabsContent>

        <TabsContent value="billing">
          <TenantDetailBilling tenantId={tenantId!} />
        </TabsContent>

        <TabsContent value="activity">
          <TenantDetailActivity tenantId={tenantId!} />
        </TabsContent>

        <TabsContent value="support">
          <TenantDetailSupport tenantId={tenantId!} />
        </TabsContent>
      </Tabs>

      {/* Suspend Tenant Dialog */}
      <SuspendTenantDialog
        tenantId={tenantId!}
        tenantName={tenant.domain || tenant.owner_email}
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
      />
    </div>
  );
}
