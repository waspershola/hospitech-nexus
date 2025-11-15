import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStayFolio } from '@/hooks/useStayFolio';
import { useRoomCurrentFolio } from '@/hooks/useRoomCurrentFolio';
import { formatCurrency } from '@/lib/finance/tax';
import { Receipt, ExternalLink, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RequestFolioLinkProps {
  request: any;
  onViewFolio?: () => void;
}

export function RequestFolioLink({ request, onViewFolio }: RequestFolioLinkProps) {
  const isBillToRoom = request.metadata?.payment_choice === 'bill_to_room';
  const roomNumber = request.metadata?.room_number || request.metadata?.qr_location;

  // Try direct folio lookup first
  const { data: directFolio, isLoading: directLoading } = useStayFolio(request.stay_folio_id);
  
  // Fallback: Fetch by room number for bill_to_room without stay_folio_id
  const { data: roomFolio, isLoading: roomLoading } = useRoomCurrentFolio(
    isBillToRoom && !request.stay_folio_id ? roomNumber : null
  );

  const folio = directFolio || roomFolio;
  const isLoading = directLoading || roomLoading;

  // Debug logging
  console.log('[RequestFolioLink] Request data:', { 
    requestId: request.id,
    stayFolioId: request.stay_folio_id,
    paymentChoice: request.metadata?.payment_choice,
    roomNumber,
    directFolio,
    roomFolio,
    finalFolio: folio,
    isLoading 
  });

  // Only show for bill_to_room requests
  if (!isBillToRoom) return null;

  // Loading state
  if (isLoading) {
    return (
      <Card className="mt-4 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Folio...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No folio found
  if (!folio) {
    console.log('[RequestFolioLink] No folio found for bill_to_room request');
    return null;
  }

  // Get display data (prefer useStayFolio format if available, fallback to room folio)
  const guestName = directFolio?.guest?.name || 'Guest';
  const roomNum = directFolio?.room?.number || roomNumber;
  const totalCharges = folio.total_charges || 0;
  const totalPayments = folio.total_payments || 0;
  const balance = folio.balance || 0;

  return (
    <Card className="mt-4 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Linked to Stay Folio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Guest:</span>
            <span className="font-medium">{guestName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room:</span>
            <span className="font-medium">{roomNum}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Charges:</span>
            <span className="font-medium">
              {formatCurrency(totalCharges, 'NGN')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Payments:</span>
            <span className="font-medium">
              {formatCurrency(totalPayments, 'NGN')}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-muted-foreground">Balance:</span>
            <span
              className={`font-semibold ${
                balance > 0
                  ? 'text-destructive'
                  : balance < 0
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {formatCurrency(balance, 'NGN')}
            </span>
          </div>
          <div className="flex justify-between pt-2 text-xs">
            <span className="text-muted-foreground">Payment:</span>
            <span className="font-medium capitalize">
              Bill to Room
            </span>
          </div>
        </div>

        {/* View Guest Folio Button */}
        {onViewFolio && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                console.log('[RequestFolioLink] Opening folio for booking:', folio.booking_id);
                onViewFolio();
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Guest Folio
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
