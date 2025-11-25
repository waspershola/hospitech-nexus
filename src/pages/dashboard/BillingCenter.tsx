import { useParams, useSearchParams } from 'react-router-dom';
import { useFolioById } from '@/hooks/useFolioById';
import { useMultiFolios } from '@/hooks/useMultiFolios';
import { useFolioPDF } from '@/hooks/useFolioPDF';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';
import { FileText, Mail, Printer, ArrowLeft, Plus, ArrowLeftRight, Merge, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FolioTransactionHistory } from '@/modules/billing/FolioTransactionHistory';
import { FolioSwitcher } from '@/components/folio/FolioSwitcher';
import { AddChargeDialog } from '@/modules/billing/AddChargeDialog';
import { CloseFolioDialog } from '@/modules/billing/CloseFolioDialog';
import { CreateFolioDialog } from '@/components/folio/CreateFolioDialog';
import { RelatedFoliosPanel } from '@/components/folio/RelatedFoliosPanel';
import { CrossFolioSummary } from '@/components/folio/CrossFolioSummary';
import { TransferChargeDialog } from '@/components/folio/TransferChargeDialog';
import { SplitChargeDialog } from '@/components/folio/SplitChargeDialog';
import { MergeFolioDialog } from '@/components/folio/MergeFolioDialog';
import { AddPaymentDialog } from '@/modules/billing/AddPaymentDialog';
import { ReopenFolioDialog } from '@/components/folio/ReopenFolioDialog';
import { FolioTypeBadge } from '@/components/folio/FolioTypeBadge';
import { RealTimeSyncIndicator } from '@/components/folio/RealTimeSyncIndicator';
import { RoomRebateModal } from '@/components/billing/RoomRebateModal';
import { useAuth } from '@/contexts/AuthContext';
import { Eye } from 'lucide-react';

export default function BillingCenter() {
  const { folioId } = useParams<{ folioId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isClosedMode = searchParams.get('mode') === 'closed';
  const { tenantId } = useAuth();
  const { data: folio, isLoading } = useFolioById(folioId || null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [closeFolioOpen, setCloseFolioOpen] = useState(false);
  const [createFolioOpen, setCreateFolioOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [mergeFolioOpen, setMergeFolioOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [roomRebateOpen, setRoomRebateOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedTransactionAmount, setSelectedTransactionAmount] = useState(0);
  const [selectedTransactionDescription, setSelectedTransactionDescription] = useState('');
  
  const isClosed = folio?.status === 'closed' || folio?.status === 'completed';
  const isReadOnly = isClosedMode || isClosed;

  // Get multi-folio support if we have a booking (BILLING-CENTER-V2.1-MULTI-FOLIO-INTEGRATION)
  const { 
    folios, 
    createFolio, 
    isCreatingFolio,
    transferCharge,
    isTransferring,
    splitCharge,
    isSplitting,
    mergeFolios,
    isMerging
  } = useMultiFolios(folio?.booking_id || null);

  console.log('[BillingCenter] BILLING-CENTER-V2-MULTI-FOLIO: Route accessed', { 
    folioId, 
    tenantId, 
    folioCount: folios.length 
  });
  
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

  // Real-time subscription using standardized cache keys (HOOKS-REFACTOR-V5)
  useEffect(() => {
    if (!folioId || !tenantId) return;

    console.log('[BillingCenter] HOOKS-REFACTOR-V5: Setting up unified real-time subscription');

    const channel = supabase
      .channel(`billing-center-${folioId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folio_transactions',
        filter: `folio_id=eq.${folioId}`
      }, () => {
        console.log('[BillingCenter] HOOKS-REFACTOR-V5: Transaction update');
        queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
        queryClient.invalidateQueries({ queryKey: ['folio-transactions', folioId, tenantId] });
        queryClient.invalidateQueries({ queryKey: ['folio-ledger', folioId, tenantId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stay_folios',
        filter: `id=eq.${folioId}`
      }, () => {
        console.log('[BillingCenter] HOOKS-REFACTOR-V5: Folio update');
        queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
        if (folio?.booking_id) {
          queryClient.invalidateQueries({ queryKey: ['multi-folios', folio.booking_id, tenantId] });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `booking_id=eq.${folio?.booking_id}`
      }, () => {
        console.log('[BillingCenter] HOOKS-REFACTOR-V5: Payment update');
        queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      })
      .subscribe();

    return () => {
      console.log('[BillingCenter] HOOKS-REFACTOR-V5: Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [folioId, tenantId, folio?.booking_id, queryClient]);

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
      {/* Header with Folio Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/finance-center')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Billing Center</h1>
              <FolioTypeBadge folioType={folio.folio_type} />
              <RealTimeSyncIndicator folioId={folioId!} />
            </div>
            <p className="text-muted-foreground">
              {folio.booking?.booking_reference} • {folio.guest?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isReadOnly && isClosed && (
            <Button
              variant="outline"
              onClick={() => setReopenDialogOpen(true)}
            >
              Reopen Folio
            </Button>
          )}
          {isReadOnly ? (
            <Badge variant="outline" className="gap-1">
              <Eye className="w-3 h-3" />
              Read-Only (Closed)
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Updates
            </Badge>
          )}
          <FolioSwitcher
            folios={folios}
            currentFolioId={folioId!}
            onSwitch={(newFolioId) => navigate(`/dashboard/billing/${newFolioId}`)}
          />
          {!isReadOnly && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCreateFolioOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Folio
            </Button>
          )}
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

      {/* Cross-Folio Summary */}
      {folios.length > 1 && (
        <CrossFolioSummary folios={folios} />
      )}

      {/* Transaction History */}
      <FolioTransactionHistory
          folioId={folioId} 
          onTransfer={!isReadOnly ? (txnId, amount) => {
            console.log('[BillingCenter] TRANSACTION-ROW-ACTIONS-V1: Transfer', txnId, amount);
            setSelectedTransactionId(txnId);
            setSelectedTransactionAmount(amount);
            setTransferDialogOpen(true);
          } : undefined}
          onSplit={!isReadOnly ? (txnId, amount, description) => {
            console.log('[BillingCenter] TRANSACTION-ROW-ACTIONS-V1: Split', txnId, amount);
            setSelectedTransactionId(txnId);
            setSelectedTransactionAmount(amount);
            setSelectedTransactionDescription(description);
            setSplitDialogOpen(true);
          } : undefined}
          onReverse={!isReadOnly ? (txnId) => {
            console.log('[BillingCenter] TRANSACTION-ROW-ACTIONS-V1: Reverse', txnId);
            // TODO: Implement reverse transaction
          } : undefined}
          availableFoliosCount={folios.length}
        />
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

        {/* Related Folios */}
        {folios.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Folios</CardTitle>
            </CardHeader>
            <CardContent>
              <RelatedFoliosPanel
                folios={folios}
                currentFolioId={folioId!}
                onSelectFolio={(id) => navigate(`/dashboard/billing/${id}`)}
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isReadOnly ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Folio is closed. Reopen to make changes.
              </p>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setAddChargeOpen(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Add Charge
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setAddPaymentOpen(true)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Add Payment
                </Button>
                {/* REBATE-INTEGRATION-V1: Room Rebate - Only for Room folios */}
                {folio.folio_type === 'room' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setRoomRebateOpen(true)}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Apply Room Rebate
                  </Button>
                )}
                {folios.length > 1 && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setTransferDialogOpen(true)}
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Transfer Charges
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setMergeFolioOpen(true)}
                    >
                      <Merge className="w-4 h-4 mr-2" />
                      Merge Folio
                    </Button>
                  </>
                )}
              </>
            )}
            <div className="pt-2 border-t" />
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
            <CreateFolioDialog
              open={createFolioOpen}
              onOpenChange={setCreateFolioOpen}
              bookingId={folio.booking_id}
              onSuccess={(newFolioId) => navigate(`/dashboard/billing/${newFolioId}`)}
            />
            <TransferChargeDialog
              open={transferDialogOpen}
              onOpenChange={setTransferDialogOpen}
              bookingId={folio.booking_id}
              transactionId={selectedTransactionId || ''}
              transactionAmount={selectedTransactionAmount}
              currentFolioId={folioId!}
            />
            <SplitChargeDialog
              open={splitDialogOpen}
              onOpenChange={setSplitDialogOpen}
              transactionAmount={selectedTransactionAmount}
              transactionDescription={selectedTransactionDescription}
              onConfirm={(splits) => {
                if (!selectedTransactionId) return;
                splitCharge({
                  transactionId: selectedTransactionId,
                  splits,
                }, {
                  onSuccess: () => {
                    console.log('[BillingCenter] BILLING-CENTER-V2.1-SPLIT: Split successful');
                    setSplitDialogOpen(false);
                  }
                });
              }}
              availableFolios={folios}
            />
            <MergeFolioDialog
              open={mergeFolioOpen}
              onOpenChange={setMergeFolioOpen}
              sourceFolioId={folioId!}
              sourceFolioNumber={folio.folio_number}
              availableFolios={folios.filter(f => f.id !== folioId)}
              onConfirm={(targetId) => {
                mergeFolios({
                  sourceFolioId: folioId!,
                  targetFolioId: targetId,
                }, {
                  onSuccess: () => {
                    console.log('[BillingCenter] BILLING-CENTER-V2.1-MERGE: Merge successful');
                    setMergeFolioOpen(false);
                    navigate(`/dashboard/billing/${targetId}`);
                  }
                });
              }}
              isLoading={isMerging}
            />
            <ReopenFolioDialog
              open={reopenDialogOpen}
              onOpenChange={setReopenDialogOpen}
              folioId={folioId!}
              folioNumber={folio.folio_number}
            />
            <AddPaymentDialog
              open={addPaymentOpen}
              onOpenChange={setAddPaymentOpen}
              bookingId={folio.booking_id}
              guestId={folio.guest_id}
              expectedAmount={folio.balance}
            />
            {/* REBATE-INTEGRATION-V1: Room Rebate Modal */}
            <RoomRebateModal
              open={roomRebateOpen}
              onOpenChange={setRoomRebateOpen}
              folioId={folioId!}
              totalCharges={folio.total_charges || 0}
              currentBalance={folio.balance || 0}
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

      {/* Reopen Folio Dialog */}
      <ReopenFolioDialog
        open={reopenDialogOpen}
        onOpenChange={setReopenDialogOpen}
        folioId={folioId!}
        folioNumber={folio.folio_number}
      />
    </div>
  );
}
