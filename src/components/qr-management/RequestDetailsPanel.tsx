import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, User, Package } from 'lucide-react';
import { format } from 'date-fns';
import { SpaBookingDetails } from '@/components/qr-portal/service-details/SpaBookingDetails';
import { LaundryOrderDetails } from '@/components/qr-portal/service-details/LaundryOrderDetails';
import { DiningReservationDetails } from '@/components/qr-portal/service-details/DiningReservationDetails';
import { RequestPaymentInfo } from './RequestPaymentInfo';
import { RequestFolioLink } from '@/components/staff/RequestFolioLink';
import { generateRequestReference } from '@/lib/qr/requestReference';

interface RequestDetailsPanelProps {
  request: any;
  showFolioLink?: boolean;
  showPaymentInfo?: boolean;
}

export function RequestDetailsPanel({
  request,
  showFolioLink = true,
  showPaymentInfo = true,
}: RequestDetailsPanelProps) {
  if (!request) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      in_progress: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const renderServiceDetails = () => {
    switch (request.type) {
      case 'spa':
        return <SpaBookingDetails metadata={request.metadata || {}} />;
      
      case 'laundry':
        return <LaundryOrderDetails metadata={request.metadata || {}} />;
      
      case 'dining_reservation':
        return <DiningReservationDetails metadata={request.metadata || {}} />;
      
      case 'housekeeping':
      case 'maintenance':
      case 'concierge':
      default:
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Request Details</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {request.note || 'No details provided'}
              </p>
            </div>
            
            {request.metadata?.description && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {request.metadata.description}
                </p>
              </div>
            )}
          </div>
        );
    }
  };

  const reference = generateRequestReference(request.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold capitalize">
            {request.type?.replace(/_/g, ' ')} Request
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-3 w-3" />
            <span className="font-mono">{reference}</span>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>

      <Separator />

      {/* Request Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground">Submitted</p>
            <p className="font-medium">
              {format(new Date(request.created_at), 'MMM d, h:mm a')}
            </p>
          </div>
        </div>
        
        {request.room && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Room</p>
              <p className="font-medium">Room {request.room.number}</p>
            </div>
          </div>
        )}

        {request.metadata?.guest_name && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Guest</p>
              <p className="font-medium">{request.metadata.guest_name}</p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Payment Information */}
      {showPaymentInfo && (
        <>
          <RequestPaymentInfo request={request} />
          <Separator />
        </>
      )}

      {/* Service-specific details */}
      {renderServiceDetails()}

      {/* Folio Link */}
      {showFolioLink && (
        <>
          <Separator />
          <RequestFolioLink request={request} />
        </>
      )}
    </div>
  );
}
