import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { LedgerEntry } from '@/types/ledger';

interface LedgerTableProps {
  entries: LedgerEntry[];
  isLoading: boolean;
  onEntryClick: (id: string) => void;
}

export function LedgerTable({ entries, isLoading, onEntryClick }: LedgerTableProps) {
  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      debit: 'destructive',
      credit: 'default',
      refund: 'secondary',
      reversal: 'outline',
      wallet_topup: 'default',
      wallet_deduction: 'destructive',
    };
    return variants[type] || 'default';
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading ledger entries...</div>;
  }

  if (!entries.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No ledger entries found for the selected filters.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Transaction Ref</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={entry.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onEntryClick(entry.id)}
            >
              <TableCell className="font-mono text-xs">
                {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {(entry as any).ledger_reference || entry.id.slice(0, 8)}
              </TableCell>
              <TableCell>
                <Badge variant={getTransactionTypeBadge(entry.transaction_type)}>
                  {entry.transaction_type.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>{entry.guest_name || '-'}</TableCell>
              <TableCell>
                <div className="text-xs">
                  <div>{entry.room_number || '-'}</div>
                  {(entry as any).room_category && (
                    <div className="text-muted-foreground">{(entry as any).room_category}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{entry.department || '-'}</TableCell>
              <TableCell>{entry.payment_method || '-'}</TableCell>
              <TableCell>{entry.payment_provider || '-'}</TableCell>
              <TableCell>{entry.payment_location || '-'}</TableCell>
              <TableCell>{entry.staff_id_initiated ? entry.staff_id_initiated.substring(0, 8) + '...' : '-'}</TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(entry.amount, entry.currency)}
              </TableCell>
              <TableCell>
                <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'}>
                  {entry.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
