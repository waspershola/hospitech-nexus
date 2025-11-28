import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { LedgerEntry } from '@/types/ledger';

interface LedgerEntryDrawerProps {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LedgerEntryDrawer({ entryId, open, onOpenChange }: LedgerEntryDrawerProps) {
  const { tenantId } = useAuth();

  const { data: entry, isLoading } = useQuery({
    queryKey: ['ledger-entry', entryId],
    queryFn: async () => {
      if (!entryId || !tenantId) return null;

      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('id', entryId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!entryId && !!tenantId && open,
  });

  if (!open || !entry) return null;

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
    }).format(amount);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ledger Entry Details</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Transaction Info */}
            <div className="space-y-3">
              <h3 className="font-medium">Transaction Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Transaction Ref:</span>
                  <p className="font-mono font-medium">{(entry as any).ledger_reference || entry.id.slice(0, 8)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <div className="mt-1">
                    <Badge>{entry.transaction_type.replace('_', ' ')}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date & Time:</span>
                  <p className="font-medium">
                    {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    <Badge variant={entry.status === 'completed' ? 'default' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Amount Details */}
            <div className="space-y-3">
              <h3 className="font-medium">Amount Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{formatAmount(entry.amount, entry.currency)}</span>
                </div>
                {entry.tax_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{formatAmount(entry.tax_amount, entry.currency)}</span>
                  </div>
                )}
                {entry.service_charge_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Charge:</span>
                    <span>{formatAmount(entry.service_charge_amount, entry.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Guest & Room Info */}
            {(entry.guest_name || entry.room_number) && (
              <>
                <div className="space-y-3">
                  <h3 className="font-medium">Guest & Room</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {entry.guest_name && (
                      <div>
                        <span className="text-muted-foreground">Guest:</span>
                        <p className="font-medium">{entry.guest_name}</p>
                      </div>
                    )}
                    {entry.room_number && (
                      <div>
                        <span className="text-muted-foreground">Room:</span>
                        <p className="font-medium">{entry.room_number}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Payment Details */}
            {entry.payment_method && (
              <>
                <div className="space-y-3">
                  <h3 className="font-medium">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Method:</span>
                      <p className="font-medium">{entry.payment_method}</p>
                    </div>
                    {entry.department && (
                      <div>
                        <span className="text-muted-foreground">Department:</span>
                        <p className="font-medium">{entry.department}</p>
                      </div>
                    )}
                    {entry.shift && (
                      <div>
                        <span className="text-muted-foreground">Shift:</span>
                        <p className="font-medium">{entry.shift}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Reconciliation Status */}
            <div className="space-y-3">
              <h3 className="font-medium">Reconciliation</h3>
              <div className="text-sm">
                <Badge variant={entry.reconciliation_status === 'reconciled' ? 'default' : 'secondary'}>
                  {entry.reconciliation_status}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
