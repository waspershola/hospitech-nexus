import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';
import { useState } from 'react';
import { Search, FileText } from 'lucide-react';

export function PostCheckoutLedgerTab() {
  const { tenantId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: ledger, isLoading } = useQuery({
    queryKey: ['post-checkout-ledger', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('post_checkout_ledger')
        .select(`
          *,
          booking:bookings(booking_reference, room:rooms(number)),
          guest:guests(name),
          payment:payments(method, transaction_ref, metadata)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load post-checkout ledger:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!tenantId
  });

  const filteredLedger = ledger?.filter(entry => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.guest?.name?.toLowerCase().includes(search) ||
      entry.booking?.booking_reference?.toLowerCase().includes(search) ||
      entry.booking?.room?.number?.toLowerCase().includes(search) ||
      entry.payment?.transaction_ref?.toLowerCase().includes(search)
    );
  });

  const totalAmount = filteredLedger?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

  const getReasonBadge = (reason: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      late_payment: 'default',
      correction: 'secondary',
      adjustment: 'outline',
      refund_reversal: 'destructive',
    };
    return <Badge variant={variants[reason] || 'default'}>{reason.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Post-Checkout Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalAmount, 'NGN')}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredLedger?.length || 0} payment{filteredLedger?.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest, booking, or transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading ledger...
          </CardContent>
        </Card>
      ) : !filteredLedger || filteredLedger.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? 'No matching entries found' : 'No post-checkout payments recorded'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedger.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.guest?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.booking?.booking_reference || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {entry.booking?.room?.number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(entry.amount, 'NGN')}
                    </TableCell>
                    <TableCell>{getReasonBadge(entry.reason)}</TableCell>
                    <TableCell className="capitalize">
                      {entry.payment?.method || 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.payment?.transaction_ref || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
