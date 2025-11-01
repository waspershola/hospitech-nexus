import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Receipt, 
  ArrowLeft, 
  DollarSign, 
  Clock, 
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { RefundModal } from './RefundModal';
import { PaymentMetadataDisplay } from '@/components/shared/PaymentMetadataDisplay';
import { toast } from 'sonner';

interface PaymentHistoryProps {
  bookingId: string;
  onClose?: () => void;
}

export function PaymentHistory({ bookingId, onClose }: PaymentHistoryProps) {
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payment-history', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for recorded_by
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.recorded_by).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          // Merge profiles into payments
          return data.map(payment => ({
            ...payment,
            recorded_by_profile: profiles?.find(p => p.id === payment.recorded_by),
          }));
        }
      }

      return data;
    },
    enabled: !!bookingId,
  });

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, guest:guests(name), room:rooms(number)')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'refunded':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'full':
        return 'Full Payment';
      case 'partial':
        return 'Partial Payment';
      case 'overpayment':
        return 'Overpayment';
      default:
        return type;
    }
  };

  const totalPaid = payments?.reduce((sum, p) => 
    p.status === 'completed' ? sum + Number(p.amount) : sum, 0
  ) || 0;

  const totalRefunded = payments?.reduce((sum, p) => 
    p.status === 'refunded' ? sum + Number(p.amount) : sum, 0
  ) || 0;

  const handleRefund = (payment: any) => {
    setSelectedPayment(payment);
    setRefundModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Payment History</h3>
            </div>
          </div>

          {booking && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Guest</p>
                <p className="font-medium">{booking.guest?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Room</p>
                <p className="font-medium">{booking.room?.number}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="font-medium">₦{Number(booking.total_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Booking Status</p>
                <Badge variant="secondary" className="capitalize">
                  {booking.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-6 bg-muted/30 border-b">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">
                ₦{totalPaid.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
            <div className="text-center">
              <RotateCcw className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">
                ₦{totalRefunded.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Refunded</p>
            </div>
            <div className="text-center">
              <CreditCard className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                ₦{(totalPaid - totalRefunded).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Net Amount</p>
            </div>
          </div>
        </div>

        {/* Payment List */}
        <ScrollArea className="h-[400px]">
          <div className="p-6 space-y-4">
            {!payments || payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payments recorded yet</p>
              </div>
            ) : (
              payments.map((payment, index) => (
                <div key={payment.id}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getStatusIcon(payment.status)}</div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              ₦{Number(payment.amount).toLocaleString()}
                            </p>
                            <Badge 
                              variant={getStatusBadgeVariant(payment.status)}
                              className="capitalize"
                            >
                              {payment.status}
                            </Badge>
                            {payment.payment_type && (
                              <Badge variant="outline" className="text-xs">
                                {getPaymentTypeLabel(payment.payment_type)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(payment.created_at), 'PPp')}
                          </p>
                        </div>

                        {payment.status === 'completed' && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('Print functionality coming soon')}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefund(payment)}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Refund
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Method</p>
                          <p className="capitalize">{payment.method || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reference</p>
                          <p className="font-mono text-xs">
                            {payment.transaction_ref || 'N/A'}
                          </p>
                        </div>
                        {payment.recorded_by && (
                          <div>
                            <p className="text-muted-foreground">Recorded By</p>
                            <p>{(payment as any).recorded_by_profile?.full_name || 'System'}</p>
                          </div>
                        )}
                        {payment.department && (
                          <div>
                            <p className="text-muted-foreground">Department</p>
                            <p className="capitalize">{payment.department}</p>
                          </div>
                        )}
                      </div>

                      <PaymentMetadataDisplay metadata={payment.metadata as Record<string, any>} />
                    </div>
                  </div>

                  {index < payments.length - 1 && <Separator className="mt-4" />}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {selectedPayment && (
        <RefundModal
          open={refundModalOpen}
          onClose={() => {
            setRefundModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          bookingId={bookingId}
        />
      )}
    </>
  );
}
