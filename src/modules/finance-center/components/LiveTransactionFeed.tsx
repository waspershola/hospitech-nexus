import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { TodayPayment } from '@/hooks/useTodayPayments';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface LiveTransactionFeedProps {
  transactions: TodayPayment[];
  isLoading: boolean;
}

export function LiveTransactionFeed({ transactions, isLoading }: LiveTransactionFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Transaction Feed</CardTitle>
          <CardDescription>Real-time view of all financial transactions</CardDescription>
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
        <CardTitle>Today's Payments</CardTitle>
        <CardDescription>Live feed of all payments made today</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No payments today
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{payment.guest_name || payment.org_name || 'Unknown'}</div>
                      {payment.room_number && (
                        <div className="text-xs text-muted-foreground">Room {payment.room_number}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.department || 'General'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{payment.method || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{payment.method_provider || ''}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 font-semibold flex items-center justify-end gap-1">
                        <ArrowUpRight className="h-4 w-4" />
                        ₦{Number(payment.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{payment.staff_name || 'System'}</div>
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
