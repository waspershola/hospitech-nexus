import { useParams } from 'react-router-dom';
import { useFolioById } from '@/hooks/useFolioById';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';
import { FileText, Mail, Printer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BillingCenter() {
  const { folioId } = useParams<{ folioId: string }>();
  const { data: folio, isLoading } = useFolioById(folioId || null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Real-time subscription
  useEffect(() => {
    if (!folioId) return;

    const channel = supabase
      .channel(`folio-${folioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folio_transactions',
        filter: `folio_id=eq.${folioId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['folio-by-id', folioId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folioId, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading folio...</div>
      </div>
    );
  }

  if (!folio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-muted-foreground">Folio not found</div>
        <Button onClick={() => navigate('/dashboard/finance-center')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Finance Center
        </Button>
      </div>
    );
  }

  const statusVariant = folio.status === 'open' ? 'default' : folio.status === 'closed' ? 'secondary' : 'outline';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/finance-center')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Billing Center</h1>
              <p className="text-muted-foreground">
                {folio.booking?.booking_reference} • {folio.guest?.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email Invoice
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Folio Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Folio Details</CardTitle>
              <Badge variant={statusVariant}>{folio.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Guest Name</div>
                <div className="font-medium">{folio.guest?.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Room</div>
                <div className="font-medium">{folio.room?.number}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Check-in</div>
                <div className="font-medium">
                  {folio.booking?.check_in ? format(new Date(folio.booking.check_in), 'MMM dd, yyyy') : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Check-out</div>
                <div className="font-medium">
                  {folio.booking?.check_out ? format(new Date(folio.booking.check_out), 'MMM dd, yyyy') : '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Charges</div>
              <div className="text-2xl font-bold">{formatCurrency(folio.total_charges || 0, 'NGN')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Payments</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(folio.total_payments || 0, 'NGN')}
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">Outstanding Balance</div>
              <div className={`text-2xl font-bold ${folio.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(folio.balance || 0, 'NGN')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Transaction history will appear here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
