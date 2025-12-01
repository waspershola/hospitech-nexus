import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, History } from 'lucide-react';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { formatCurrency } from '@/lib/finance/tax';
import { Skeleton } from '@/components/ui/skeleton';

interface IncomingReservationCardProps {
  incomingReservation: any;
  checkInTime: string;
  onCollectPayment: (bookingId: string, guestId: string, balance: number) => void;
  onViewHistory: (bookingId: string) => void;
}

export function IncomingReservationCard({
  incomingReservation,
  checkInTime,
  onCollectPayment,
  onViewHistory,
}: IncomingReservationCardProps) {
  const { data: folioData, isLoading } = useBookingFolio(incomingReservation.id);

  const totalAmount = folioData?.totalCharges || incomingReservation.total_amount || 0;
  const paymentsMade = folioData?.totalPayments || 0;
  const balanceDue = totalAmount - paymentsMade;

  const getPaymentStatusBadge = () => {
    if (balanceDue <= 0) {
      return <Badge variant="default" className="bg-green-600">Fully Paid</Badge>;
    } else if (paymentsMade > 0) {
      return <Badge variant="default" className="bg-orange-500">Partial</Badge>;
    } else {
      return <Badge variant="destructive">Unpaid</Badge>;
    }
  };

  return (
    <Alert className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="space-y-3">
        <div className="space-y-1">
          <div className="font-semibold text-orange-900 dark:text-orange-100">
            Upcoming Arrival Today
          </div>
          <div className="text-sm space-y-0.5">
            <div>
              <span className="font-medium">Guest:</span>{' '}
              {incomingReservation.guest?.name || 'Unknown Guest'}
            </div>
            <div>
              <span className="font-medium">Check-in:</span> {checkInTime}
            </div>
            {incomingReservation.organization && (
              <div>
                <span className="font-medium">Organization:</span>{' '}
                {incomingReservation.organization.name}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-orange-200 dark:border-orange-800 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="font-semibold">Reservation Balance</span>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payments:</span>
                <span className="font-medium">{formatCurrency(paymentsMade)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="font-semibold">Balance:</span>
                <div className="flex items-center gap-2">
                  {getPaymentStatusBadge()}
                  <span className="font-semibold">{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          {balanceDue > 0 && (
            <Button
              onClick={() =>
                onCollectPayment(
                  incomingReservation.id,
                  incomingReservation.guest?.id,
                  balanceDue
                )
              }
              className="w-full"
              variant="default"
              disabled={isLoading}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Collect Payment for {incomingReservation.guest?.name?.split(' ')[0]}
            </Button>
          )}
          <Button
            onClick={() => onViewHistory(incomingReservation.id)}
            className="w-full"
            variant="outline"
          >
            <History className="h-4 w-4 mr-2" />
            View Payment History
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-orange-100/50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
          <Clock className="h-3 w-3 inline mr-1" />
          Room must be ready by {checkInTime}
        </div>
      </AlertDescription>
    </Alert>
  );
}
