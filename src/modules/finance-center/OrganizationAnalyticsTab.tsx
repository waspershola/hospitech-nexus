import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, AlertCircle, Wallet } from 'lucide-react';

export function OrganizationAnalyticsTab() {
  const { tenantId } = useAuth();

  const { data: orgStats, isLoading } = useQuery({
    queryKey: ['organization-analytics', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch organizations with their wallet balances and payment totals
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          credit_limit,
          allow_negative_balance,
          wallet_id,
          wallets(balance, currency)
        `)
        .eq('tenant_id', tenantId)
        .eq('active', true);

      if (error) throw error;

      // Fetch payment totals for each organization
      const orgIds = orgs?.map(org => org.id) || [];
      const { data: payments } = await supabase
        .from('payments')
        .select('organization_id, amount')
        .eq('tenant_id', tenantId)
        .in('organization_id', orgIds)
        .eq('status', 'success');

      // Calculate stats for each organization
      return orgs?.map(org => {
        const orgPayments = payments?.filter(p => p.organization_id === org.id) || [];
        const totalSpent = orgPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const wallet = org.wallets as any;
        const balance = Number(wallet?.balance || 0);
        const creditUsed = Math.abs(balance);
        const creditLimit = Number(org.credit_limit || 0);
        const creditPercent = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;

        return {
          id: org.id,
          name: org.name,
          creditLimit,
          balance,
          totalSpent,
          creditUsed,
          creditPercent,
          allowNegative: org.allow_negative_balance,
          nearLimit: creditPercent >= 80 && creditPercent < 100,
          overLimit: creditPercent >= 100 && !org.allow_negative_balance,
        };
      }).sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)) || [];
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  const totalOrgs = orgStats?.length || 0;
  const totalSpent = orgStats?.reduce((sum, org) => sum + org.totalSpent, 0) || 0;
  const orgsNearLimit = orgStats?.filter(org => org.nearLimit).length || 0;
  const orgsOverLimit = orgStats?.filter(org => org.overLimit).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Organizations</p>
                <p className="text-2xl font-bold">{totalOrgs}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">₦{totalSpent.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Near Limit</p>
                <p className="text-2xl font-bold text-yellow-600">{orgsNearLimit}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Over Limit</p>
                <p className="text-2xl font-bold text-destructive">{orgsOverLimit}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization List */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orgStats?.map(org => (
              <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{org.name}</h3>
                    {org.overLimit && (
                      <Badge variant="destructive">Over Limit</Badge>
                    )}
                    {org.nearLimit && !org.overLimit && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                        Near Limit
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Spent:</span>
                      <p className="font-medium">₦{org.totalSpent.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credit Used:</span>
                      <p className="font-medium text-destructive">₦{org.creditUsed.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credit Limit:</span>
                      <p className="font-medium">₦{org.creditLimit.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Utilization:</span>
                      <p className={`font-medium ${org.creditPercent >= 80 ? 'text-destructive' : 'text-green-600'}`}>
                        {org.creditPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        org.creditPercent >= 100 ? 'bg-destructive' : 
                        org.creditPercent >= 80 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(org.creditPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="ml-4">
                  <Wallet className={`h-6 w-6 ${
                    org.overLimit ? 'text-destructive' : 
                    org.nearLimit ? 'text-yellow-500' : 
                    'text-green-500'
                  }`} />
                </div>
              </div>
            ))}

            {!orgStats || orgStats.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No organization data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
