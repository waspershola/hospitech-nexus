import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCashDrawer } from '@/hooks/useCashDrawer';

export function CashDrawerHistory() {
  const { history, isLoading } = useCashDrawer();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading history...</div>;
  }

  if (!history?.length) {
    return <div className="text-center py-4 text-muted-foreground">No drawer history found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>Opened At</TableHead>
          <TableHead>Closed At</TableHead>
          <TableHead className="text-right">Opening</TableHead>
          <TableHead className="text-right">Closing</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((drawer) => {
          const metadata = drawer.metadata as any;
          const variance = metadata?.variance || 0;
          const hasVariance = Math.abs(variance) > 0.01;

          return (
            <TableRow key={drawer.id}>
              <TableCell>{format(new Date(drawer.batch_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{metadata?.shift || 'N/A'}</TableCell>
              <TableCell className="text-xs">
                {metadata?.opened_at
                  ? format(new Date(metadata.opened_at), 'HH:mm')
                  : 'N/A'}
              </TableCell>
              <TableCell className="text-xs">
                {metadata?.closed_at
                  ? format(new Date(metadata.closed_at), 'HH:mm')
                  : '-'}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(metadata?.opening_balance || 0)}
              </TableCell>
              <TableCell className="text-right">
                {metadata?.closing_balance
                  ? formatCurrency(metadata.closing_balance)
                  : '-'}
              </TableCell>
              <TableCell className="text-right">
                {metadata?.variance !== undefined ? (
                  <span className={hasVariance ? 'text-destructive font-medium' : ''}>
                    {formatCurrency(variance)}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <Badge variant={drawer.status === 'open' ? 'default' : 'secondary'}>
                  {drawer.status}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
