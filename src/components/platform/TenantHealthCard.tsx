import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { TenantHealthScore } from '@/hooks/useTenantHealth';

interface TenantHealthCardProps {
  health: TenantHealthScore;
}

export function TenantHealthCard({ health }: TenantHealthCardProps) {
  const getRiskIcon = () => {
    switch (health.risk_level) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getRiskColor = () => {
    switch (health.risk_level) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRiskIcon()}
            <div>
              <CardTitle className="text-lg">{health.tenant_name}</CardTitle>
              <Badge variant={getRiskColor()} className="mt-1">
                {health.risk_level.toUpperCase()} RISK
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(health.overall_score)}`}>
              {health.overall_score}
            </div>
            <p className="text-xs text-muted-foreground">Health Score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Payment</span>
              <span className={`font-medium ${getScoreColor(health.payment_score)}`}>
                {health.payment_score}%
              </span>
            </div>
            <Progress value={health.payment_score} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Usage</span>
              <span className={`font-medium ${getScoreColor(health.usage_score)}`}>
                {health.usage_score}%
              </span>
            </div>
            <Progress value={health.usage_score} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Engagement</span>
              <span className={`font-medium ${getScoreColor(health.engagement_score)}`}>
                {health.engagement_score}%
              </span>
            </div>
            <Progress value={health.engagement_score} className="h-2" />
          </div>
        </div>

        {/* Flags */}
        {health.flags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Issues</h4>
            <div className="flex flex-wrap gap-2">
              {health.flags.map((flag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {health.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {health.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
