import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface UsageLimit {
  usageType: string;
  usageName: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
  overageRate?: number;
}

interface UsageLimitsCardProps {
  limits: UsageLimit[];
  warnings: UsageLimit[];
  hasExceededLimits: boolean;
}

export function UsageLimitsCard({ limits, warnings, hasExceededLimits }: UsageLimitsCardProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 80) return 'bg-warning';
    return 'bg-primary';
  };

  const getWarningIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  const getWarningBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Limit Exceeded</Badge>;
      case 'high':
        return <Badge variant="destructive">Critical</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-warning">Warning</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Usage Limits</CardTitle>
            <CardDescription>
              Current usage vs. plan limits for this month
            </CardDescription>
          </div>
          {hasExceededLimits && (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Limits Exceeded
            </Badge>
          )}
          {!hasExceededLimits && warnings.length > 0 && (
            <Badge variant="default" className="gap-1 bg-warning">
              <AlertTriangle className="h-3 w-3" />
              {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {limits.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No plan limits configured
          </div>
        ) : (
          limits.map((limit) => (
            <div key={limit.usageType} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getWarningIcon(limit.warningLevel)}
                  <span className="font-medium">{limit.usageName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getWarningBadge(limit.warningLevel)}
                  <span className="text-sm text-muted-foreground">
                    {limit.currentUsage.toLocaleString()} / {limit.limit.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${getProgressColor(limit.percentage)}`}
                    style={{ width: `${Math.min(limit.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium min-w-[3rem] text-right">
                  {limit.percentage}%
                </span>
              </div>

              {limit.percentage >= 100 && limit.overageRate && (
                <div className="text-sm text-destructive">
                  Overage rate: ₦{limit.overageRate.toLocaleString()} per unit
                </div>
              )}

              {limit.percentage >= 80 && limit.percentage < 100 && (
                <div className="text-sm text-warning">
                  Approaching limit - consider upgrading your plan
                </div>
              )}
            </div>
          ))
        )}

        {warnings.length > 0 && (
          <div className="mt-4 p-4 border border-warning bg-warning/10 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Usage Warnings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are approaching or have exceeded {warnings.length} limit{warnings.length > 1 ? 's' : ''}.
                  {hasExceededLimits 
                    ? ' Overage charges will apply for usage beyond your plan limits.'
                    : ' Consider upgrading your plan to avoid overage charges.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
