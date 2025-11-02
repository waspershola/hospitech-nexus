import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DebtorCreditor } from '@/hooks/useDebtorsCreditors';
import { formatDistanceToNow } from 'date-fns';
import { Wallet, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CreditorsCardProps {
  data: DebtorCreditor[];
  isLoading: boolean;
}

export function CreditorsCard({ data, isLoading }: CreditorsCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Creditors</CardTitle>
          <CardDescription>Active wallet credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-600" />
          <CardTitle>Top Creditors</CardTitle>
        </div>
        <CardDescription>Active wallet credits ({data?.length || 0})</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {!data || data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No active wallet credits
            </div>
          ) : (
            data.map((creditor) => (
              <div
                key={creditor.entity_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{creditor.entity_name}</span>
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                      {creditor.entity_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-green-600 font-semibold">
                    ₦{creditor.total_amount.toLocaleString()} credit
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last activity: {formatDistanceToNow(new Date(creditor.last_activity), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/wallets')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
