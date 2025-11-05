import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';

interface SMSCreditsCardProps {
  creditsAvailable: number;
  creditsUsed: number;
  totalPurchased: number;
}

export function SMSCreditsCard({ creditsAvailable, creditsUsed, totalPurchased }: SMSCreditsCardProps) {
  const usagePercent = totalPurchased > 0 ? (creditsUsed / totalPurchased) * 100 : 0;
  const remainingPercent = totalPurchased > 0 ? (creditsAvailable / totalPurchased) * 100 : 0;
  
  const getStatusBadge = () => {
    if (remainingPercent < 10) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Critical</Badge>;
    } else if (remainingPercent < 25) {
      return <Badge variant="outline" className="gap-1 border-orange-500 text-orange-500"><AlertTriangle className="h-3 w-3" />Low</Badge>;
    }
    return <Badge variant="default" className="gap-1">Healthy</Badge>;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>SMS Credits Overview</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>Track your SMS balance and usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-green-600">{creditsAvailable.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Used</p>
            <p className="text-2xl font-bold text-orange-600">{creditsUsed.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{totalPurchased.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usage Progress</span>
            <span className="font-medium">{usagePercent.toFixed(1)}%</span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{creditsUsed.toLocaleString()} sent</span>
            <span>{creditsAvailable.toLocaleString()} remaining</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {remainingPercent.toFixed(0)}% remaining
            </span>
          </div>
          {remainingPercent < 25 && (
            <p className="text-xs text-orange-600 font-medium">
              Consider purchasing more credits
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
