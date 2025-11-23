import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import { AddChargeToFolioDialog } from '@/components/qr-management/AddChargeToFolioDialog';
import { PaymentForm } from '@/modules/payments/PaymentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function QRBillingTasks() {
  const { tenantId } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Fetch pending billing tasks
  const { data: billingTasks = [], refetch } = useQuery({
    queryKey: ['qr-billing-tasks', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          rooms (number),
          guests (name, phone, email)
        `)
        .eq('tenant_id', tenantId)
        .eq('billing_status', 'pending_frontdesk')
        .eq('billing_routed_to', 'frontdesk')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const handleMarkCompleted = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          billing_status: 'posted_to_folio',
          billing_processed_by: tenantId,
          billing_processed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', requestId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      toast.success('Billing task marked as completed');
      refetch();
    } catch (err: any) {
      toast.error('Failed to update task', {
        description: err.message
      });
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          billing_status: 'cancelled',
          billing_processed_by: tenantId,
          billing_processed_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      toast.success('Billing task cancelled');
      refetch();
    } catch (err: any) {
      toast.error('Failed to cancel task', {
        description: err.message
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Billing Tasks</h1>
          <p className="text-muted-foreground">
            Requests transferred to Front Desk for billing
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {billingTasks.length} Pending
        </Badge>
      </div>

      {billingTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No pending billing tasks</p>
            <p className="text-sm text-muted-foreground">
              Tasks transferred for billing will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {billingTasks.map((task) => {
            const metadata = task.metadata as any;
            const amount = metadata?.payment_info?.total_amount || 
                          metadata?.payment_info?.subtotal || 0;
            const amountDisplay = (amount / 100).toLocaleString();

            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <span className="font-mono text-primary">
                          {task.billing_reference_code}
                        </span>
                        <Badge variant="outline">{task.type}</Badge>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {task.rooms?.number && (
                          <p>Room {task.rooms.number}</p>
                        )}
                        {task.guests?.name && (
                          <p>{task.guests.name}</p>
                        )}
                        <p>
                          Transferred {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ₦{amountDisplay}
                      </div>
                      <p className="text-sm text-muted-foreground">Amount Due</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedRequest(task);
                        setShowAddCharge(true);
                      }}
                      className="flex-1"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Add to Folio
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(task);
                        setShowPayment(true);
                      }}
                      className="flex-1"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Collect Payment
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMarkCompleted(task.id)}
                      title="Mark as Completed"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancel(task.id)}
                      title="Cancel Task"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Charge to Folio Dialog */}
      {selectedRequest && (
        <AddChargeToFolioDialog
          open={showAddCharge}
          onOpenChange={setShowAddCharge}
          request={selectedRequest}
          billingReferenceCode={selectedRequest.billing_reference_code}
          onSuccess={() => {
            setShowAddCharge(false);
            setSelectedRequest(null);
            refetch();
          }}
        />
      )}

      {/* Payment Form Dialog */}
      {selectedRequest && (
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Collect Payment</DialogTitle>
            </DialogHeader>
            <PaymentForm
              guestId={selectedRequest.guest_id}
              bookingId={(selectedRequest.metadata as any)?.booking_id}
              prefilledAmount={
                ((selectedRequest.metadata as any)?.payment_info?.total_amount || 
                 (selectedRequest.metadata as any)?.payment_info?.subtotal || 0) / 100
              }
              billingReferenceCode={selectedRequest.billing_reference_code}
              requestId={selectedRequest.id}
              onSuccess={() => {
                setShowPayment(false);
                setSelectedRequest(null);
                refetch();
              }}
              onCancel={() => setShowPayment(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
