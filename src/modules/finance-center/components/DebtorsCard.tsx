import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DebtorCreditor } from '@/hooks/useDebtorsCreditors';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DebtorsCardProps {
  data: DebtorCreditor[];
  isLoading: boolean;
}

export function DebtorsCard({ data, isLoading }: DebtorsCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Debtors</CardTitle>
          <CardDescription>Outstanding receivables</CardDescription>
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
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <CardTitle>Top Debtors</CardTitle>
        </div>
        <CardDescription>Outstanding receivables ({data.length})</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No outstanding receivables 🎉
            </div>
          ) : (
            data.map((debtor) => (
              <div
                key={debtor.entity_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{debtor.entity_name}</span>
                    <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-200">
                      {debtor.entity_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-600 font-semibold">
                    ₦{debtor.total_amount.toLocaleString()} owed
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last activity: {formatDistanceToNow(new Date(debtor.last_activity), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/receivables')}
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
