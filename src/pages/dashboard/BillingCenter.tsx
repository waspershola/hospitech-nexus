import { useParams } from 'react-router-dom';
import { useFolioById } from '@/hooks/useFolioById';
import { useFolioPDF } from '@/hooks/useFolioPDF';
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
import { FolioTransactionHistory } from '@/modules/billing/FolioTransactionHistory';
import { AddChargeDialog } from '@/modules/billing/AddChargeDialog';
import { CloseFolioDialog } from '@/modules/billing/CloseFolioDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function BillingCenter() {
  const { folioId } = useParams<{ folioId: string }>();
  const { tenantId } = useAuth();
  const { data: folio, isLoading } = useFolioById(folioId || null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [closeFolioOpen, setCloseFolioOpen] = useState(false);

  console.log('[BillingCenter] BILLING-CENTER-V2: Route accessed', { folioId, tenantId });
  
  const { 
    generatePDF, 
    emailFolio, 
    printFolio,
    downloadFolio,
    isGenerating,
    isPrinting,
    isEmailing,
    isDownloading
  } = useFolioPDF();

  // Real-time subscription for folio updates
  useEffect(() => {
    if (!folioId || !tenantId) return;

    const channel = supabase
      .channel(`folio-${folioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folio_transactions',
        filter: `folio_id=eq.${folioId}`
      }, () => {
        console.log('[BillingCenter] Transaction update');
        queryClient.invalidateQueries({ queryKey: ['folio-by-id', folioId, tenantId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stay_folios',
        filter: `id=eq.${folioId}`
      }, () => {
        console.log('[BillingCenter] Folio update');
        queryClient.invalidateQueries({ queryKey: ['folio-by-id', folioId, tenantId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
      }, (payload) => {
        console.log('[BillingCenter] Payment update');
        queryClient.invalidateQueries({ queryKey: ['folio-by-id', folioId, tenantId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folioId, tenantId, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading folio...</div>
      </div>
    );
  }

  // Handle direct navigation from sidebar (no folioId)
  if (!folioId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-muted-foreground">Please select a folio to view</div>
        <p className="text-sm text-muted-foreground text-center">
          Access Billing Center from a specific booking or folio.<br />
          Go to Finance Center → Folios to view all folios.
        </p>
        <Button onClick={() => navigate('/dashboard/finance-center')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go to Finance Center
        </Button>
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content - 3 columns */}
      <div className="lg:col-span-3 space-y-6">
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
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => downloadFolio({ folioId: folioId!, format: 'A4' })}
              disabled={isDownloading || !folioId}
            >
              <FileText className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => emailFolio({ 
                folioId: folioId!, 
                format: 'A4',
                guestEmail: folio?.guest?.email || '',
                guestName: folio?.guest?.name || ''
              })}
              disabled={isEmailing || !folioId || !folio?.guest?.email}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Invoice
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => printFolio({ folioId: folioId!, format: 'A4' })}
              disabled={isPrinting || !folioId}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            All actions use the latest folio template (V3). Download saves locally, Print opens in new tab.
          </p>
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

      {/* Transaction History */}
      <FolioTransactionHistory folioId={folioId} />
      </div>

      {/* Sidebar - 1 column */}
      <div className="space-y-6">
        {/* Guest Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Guest Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Guest Name</div>
              <div className="font-medium">{folio.guest?.name}</div>
            </div>
            {folio.guest?.email && (
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium text-sm">{folio.guest.email}</div>
              </div>
            )}
            {folio.guest?.phone && (
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{folio.guest.phone}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Room</div>
              <div className="font-medium">{folio.room?.number}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Booking Reference</div>
              <div className="font-medium text-sm">{folio.booking?.booking_reference}</div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {folio.status === 'open' && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setAddChargeOpen(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Add Charge
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => generatePDF({ folioId: folioId!, format: 'A4' })}
              disabled={isGenerating}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate PDF
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => printFolio({ folioId: folioId!, format: 'A4' })}
              disabled={isPrinting}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Folio
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => emailFolio({ 
                folioId: folioId!, 
                format: 'A4',
                guestEmail: folio?.guest?.email || '',
                guestName: folio?.guest?.name || ''
              })}
              disabled={isEmailing || !folio?.guest?.email}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Invoice
            </Button>
            <div className="pt-2 border-t">
              <Button 
                variant={folio.status === 'open' ? 'outline' : 'default'}
                className="w-full justify-start"
                onClick={() => setCloseFolioOpen(true)}
              >
                {folio.status === 'open' ? 'Close Folio' : 'Reopen Folio'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        {folioId && (
          <>
            <AddChargeDialog
              open={addChargeOpen}
              onOpenChange={setAddChargeOpen}
              folioId={folioId}
            />
            <CloseFolioDialog
              open={closeFolioOpen}
              onOpenChange={setCloseFolioOpen}
              folioId={folioId}
              currentStatus={folio.status}
              folioBalance={folio.balance || 0}
            />
          </>
        )}

        {/* Folio Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Folio Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={statusVariant}>{folio.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Balance</span>
              <span className={`font-bold ${folio.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(folio.balance || 0, 'NGN')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
