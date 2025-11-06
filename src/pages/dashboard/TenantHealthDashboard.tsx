import { useTenantHealth } from '@/hooks/useTenantHealth';
import { TenantHealthCard } from '@/components/platform/TenantHealthCard';
import { HealthSummaryCards } from '@/components/platform/HealthSummaryCards';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantHealthDashboard() {
  const { healthScores, summary, isLoading, recalculate, isRecalculating } = useTenantHealth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-foreground">Tenant Health Dashboard</h1>
            <p className="text-muted-foreground">Monitor tenant health and identify at-risk accounts</p>
          </div>
          <Activity className="h-8 w-8 text-primary" />
        </div>
        
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const criticalTenants = healthScores.filter(h => h.risk_level === 'critical');
  const highRiskTenants = healthScores.filter(h => h.risk_level === 'high');
  const mediumRiskTenants = healthScores.filter(h => h.risk_level === 'medium');
  const lowRiskTenants = healthScores.filter(h => h.risk_level === 'low');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Tenant Health Dashboard</h1>
          <p className="text-muted-foreground">Monitor tenant health and identify at-risk accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => recalculate.mutate(undefined)}
            disabled={isRecalculating}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate Scores
          </Button>
          <Activity className="h-8 w-8 text-primary" />
        </div>
      </div>

      <HealthSummaryCards summary={summary} />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tenants ({healthScores.length})</TabsTrigger>
          <TabsTrigger value="critical" className="text-red-500">
            Critical ({criticalTenants.length})
          </TabsTrigger>
          <TabsTrigger value="high" className="text-orange-500">
            High Risk ({highRiskTenants.length})
          </TabsTrigger>
          <TabsTrigger value="medium" className="text-yellow-500">
            Medium Risk ({mediumRiskTenants.length})
          </TabsTrigger>
          <TabsTrigger value="low" className="text-green-500">
            Low Risk ({lowRiskTenants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {healthScores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No tenant health data available
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {healthScores.map((health) => (
                <TenantHealthCard key={health.tenant_id} health={health} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          {criticalTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No critical risk tenants
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {criticalTenants.map((health) => (
                <TenantHealthCard key={health.tenant_id} health={health} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="high" className="space-y-4">
          {highRiskTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No high risk tenants
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {highRiskTenants.map((health) => (
                <TenantHealthCard key={health.tenant_id} health={health} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="medium" className="space-y-4">
          {mediumRiskTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No medium risk tenants
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {mediumRiskTenants.map((health) => (
                <TenantHealthCard key={health.tenant_id} health={health} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="low" className="space-y-4">
          {lowRiskTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No low risk tenants
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {lowRiskTenants.map((health) => (
                <TenantHealthCard key={health.tenant_id} health={health} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
