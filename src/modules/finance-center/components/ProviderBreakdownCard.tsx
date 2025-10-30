import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProviderBreakdown } from '@/hooks/useFinanceOverview';
import { CreditCard } from 'lucide-react';

interface ProviderBreakdownCardProps {
  data: ProviderBreakdown[];
  isLoading: boolean;
}

export function ProviderBreakdownCard({ data, isLoading }: ProviderBreakdownCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Breakdown</CardTitle>
          <CardDescription>Transactions grouped by provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
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
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Payment Method Breakdown</CardTitle>
        </div>
        <CardDescription>Transactions grouped by provider</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No provider data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((provider) => (
                  <TableRow key={provider.provider_name}>
                    <TableCell className="font-medium">{provider.provider_name}</TableCell>
                    <TableCell className="text-right">{provider.transaction_count}</TableCell>
                    <TableCell className="text-right text-green-600">
                      ₦{provider.total_inflow.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ₦{provider.total_outflow.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${provider.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₦{provider.net_balance.toLocaleString()}
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
