import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TransactionFeedItem } from '@/hooks/useFinanceOverview';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface LiveActivityStreamProps {
  transactions: TransactionFeedItem[];
}

export function LiveActivityStream({ transactions }: LiveActivityStreamProps) {
  const recentTransactions = transactions.slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          <CardTitle>Live Activity</CardTitle>
        </div>
        <CardDescription>Recent transactions (last 20)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No recent activity
              </div>
            ) : (
              recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${txn.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {txn.type === 'credit' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        ₦{Number(txn.amount).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {txn.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {txn.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {txn.guest_name || txn.org_name || 'Unknown'}
                      </span>
                      {txn.department && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{txn.department}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
