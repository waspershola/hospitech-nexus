import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, TrendingUp, Users, Building2, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OrgLimitsSummaryProps {
  organizationId: string;
}

export function OrgLimitsSummary({ organizationId }: OrgLimitsSummaryProps) {
  const { tenantId } = useAuth();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['org-wallet-rules', organizationId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_wallet_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('tenant_id', tenantId)
        .eq('active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!tenantId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Spending Limits
          </CardTitle>
          <CardDescription>No spending limits configured</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This organization can spend without restrictions. Configure rules to set limits.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'per_guest':
        return <Users className="h-4 w-4" />;
      case 'per_department':
        return <Building2 className="h-4 w-4" />;
      case 'total_cap':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getRuleLabel = (ruleType: string, entityRef?: string) => {
    switch (ruleType) {
      case 'per_guest':
        return 'Per Guest Limit';
      case 'per_department':
        return `Department: ${entityRef || 'All'}`;
      case 'total_cap':
        return 'Total Wallet Cap';
      default:
        return ruleType;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Active Spending Limits
        </CardTitle>
        <CardDescription>
          {rules.length} active {rules.length === 1 ? 'rule' : 'rules'} configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
            >
              <div className="flex items-center gap-3">
                {getRuleIcon(rule.rule_type)}
                <div>
                  <p className="font-medium text-sm">
                    {getRuleLabel(rule.rule_type, rule.entity_ref || undefined)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{rule.period} period</p>
                </div>
              </div>
              <Badge variant="outline" className="font-semibold">
                ₦{Number(rule.limit_amount).toLocaleString()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
