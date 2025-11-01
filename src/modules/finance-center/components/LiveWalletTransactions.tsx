import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransactionFeedItem } from '@/hooks/useFinanceOverview';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface LiveWalletTransactionsProps {
  transactions: TransactionFeedItem[];
  isLoading: boolean;
}

export function LiveWalletTransactions({ transactions, isLoading }: LiveWalletTransactionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Wallet Transactions</CardTitle>
          <CardDescription>Real-time view of all wallet transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
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
        <CardTitle>Live Wallet Transactions</CardTitle>
        <CardDescription>Real-time view of all wallet transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={txn.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(txn.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{txn.guest_name || txn.org_name || 'Unknown'}</div>
                      {txn.room_number && (
                        <div className="text-xs text-muted-foreground">Room {txn.room_number}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{txn.department || 'General'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {txn.type === 'credit' ? (
                          <>
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">Credit</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-medium">Debit</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{txn.provider_name || txn.source}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={txn.type === 'credit' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        ₦{Number(txn.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.balance_after !== null ? (
                        <span className="text-muted-foreground">₦{Number(txn.balance_after).toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{txn.created_by_name || 'System'}</div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
