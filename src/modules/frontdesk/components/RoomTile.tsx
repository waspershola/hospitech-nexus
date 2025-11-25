import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import { getRoomStatusNow } from '@/lib/roomAvailability';
import { useOperationsHours } from '@/hooks/useOperationsHours';

// Helper to extract surname only from full name
const extractSurname = (fullName: string) => {
  if (!fullName) return '';
  // Remove common prefixes
  const cleaned = fullName.replace(/^(ALH|ALHAJI|ALHAJA|MR|MRS|MS|DR|PROF|CHIEF|HON)\s+/i, '');
  const parts = cleaned.trim().split(' ');
  // Return last word (surname)
  return parts[parts.length - 1];
};

interface RoomTileProps {
  room: any;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

const statusColors = {
  available: 'bg-[hsl(var(--status-available))] text-white',
  occupied: 'bg-[hsl(var(--status-occupied))] text-white',
  reserved: 'bg-[hsl(var(--status-reserved))] text-white',
  cleaning: 'bg-[hsl(var(--status-dirty))] text-white',
  maintenance: 'bg-[hsl(var(--status-oos))] text-white',
  overstay: 'bg-[hsl(var(--status-overstay))] text-white',
  'departing-today': 'bg-orange-600 text-white', // DEPARTING-TODAY-BADGE-V1
  checking_in: 'bg-blue-600 text-white',
  checking_out: 'bg-purple-600 text-white',
  out_of_order: 'bg-[hsl(var(--status-oos))] text-white',
};

const statusBorderColors = {
  available: 'border-[hsl(var(--status-available)/0.3)] hover:border-[hsl(var(--status-available))]',
  occupied: 'border-[hsl(var(--status-occupied)/0.3)] hover:border-[hsl(var(--status-occupied))]',
  reserved: 'border-[hsl(var(--status-reserved)/0.3)] hover:border-[hsl(var(--status-reserved))]',
  cleaning: 'border-[hsl(var(--status-dirty)/0.3)] hover:border-[hsl(var(--status-dirty))]',
  maintenance: 'border-[hsl(var(--status-oos)/0.3)] hover:border-[hsl(var(--status-oos))]',
  overstay: 'border-[hsl(var(--status-overstay)/0.3)] hover:border-[hsl(var(--status-overstay))]',
  'departing-today': 'border-orange-600/30 hover:border-orange-600', // DEPARTING-TODAY-BADGE-V1
  checking_in: 'border-blue-600/30 hover:border-blue-600',
  checking_out: 'border-purple-600/30 hover:border-purple-600',
  out_of_order: 'border-[hsl(var(--status-oos)/0.3)] hover:border-[hsl(var(--status-oos))]',
};

export function RoomTile({ room, onClick, isSelectionMode, isSelected, onSelectionChange }: RoomTileProps) {
  const { data: operationsHours } = useOperationsHours();
  
  // PHASE-2-FIX: Use canonical status from RoomGrid instead of recomputing
  // RoomGrid already provides room.status from calculateStayLifecycleState
  // and room.bookings contains only the selected activeBooking
  
  const bookingsArray = Array.isArray(room.bookings) ? room.bookings : room.bookings ? [room.bookings] : [];
  const activeBooking = bookingsArray[0] ?? null;
  
  // Prefer canonical status from RoomGrid, fallback to getRoomStatusNow for legacy callers
  const currentStatus = room.status ?? getRoomStatusNow(
    room,
    activeBooking,
    operationsHours?.checkInTime,
    operationsHours?.checkOutTime
  );
  
  const statusColor = statusColors[currentStatus as keyof typeof statusColors] || statusColors.available;
  const borderColor = statusBorderColors[currentStatus as keyof typeof statusBorderColors] || statusBorderColors.available;
  
  const organization = activeBooking?.organization;
  const guest = activeBooking?.guest;
  
  // Calculate rate: room-specific rate or category base rate
  const displayRate = room.rate ?? room.category?.base_rate ?? 0;
  
  // Calculate folio balance (total amount - payments made)
  // This is a simplified calculation - in real scenarios would need to fetch payments
  const totalAmount = activeBooking?.total_amount ?? 0;
  
  // Fetch organization wallet info if organization exists
  const { data: orgWallet } = useOrganizationWallet(organization?.id);

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.stopPropagation();
      onSelectionChange?.(!isSelected);
    } else {
      onClick();
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelectionChange?.(checked);
  };

  const hasDND = room.notes?.includes('[DND]');

  // Status border accent colors
  const statusBorderAccent = {
    available: 'border-l-[hsl(var(--status-available))]',
    occupied: 'border-l-[hsl(var(--status-occupied))]',
    reserved: 'border-l-[hsl(var(--status-reserved))]',
    cleaning: 'border-l-[hsl(var(--status-dirty))]',
    maintenance: 'border-l-[hsl(var(--status-oos))]',
    overstay: 'border-l-[hsl(var(--status-overstay))]',
    'departing-today': 'border-l-orange-600',
    checking_in: 'border-l-blue-600',
    checking_out: 'border-l-purple-600',
    out_of_order: 'border-l-[hsl(var(--status-oos))]',
  };

  const accentColor = statusBorderAccent[currentStatus as keyof typeof statusBorderAccent] || statusBorderAccent.available;

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          'cursor-pointer transition-all duration-200 active:scale-95 border-l-4 rounded-lg relative touch-manipulation',
          'lg:hover:shadow-md flex flex-col bg-card min-h-[100px]',
          accentColor,
          isSelected && 'ring-2 ring-primary ring-offset-2'
        )}
        onClick={handleClick}
      >
      <CardHeader className="px-2.5 py-2 flex-1 flex flex-col justify-between gap-1.5">
        {isSelectionMode && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border-2"
            />
          </div>
        )}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <h3 className="text-sm font-semibold font-display text-foreground">Room {room.number}</h3>
              {hasDND && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-0.5 rounded-full bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      <BellOff className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Do Not Disturb</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {room.category?.name || room.type || 'Standard'}
            </p>
            {displayRate > 0 && (
              <p className="text-[10px] font-semibold text-primary">
                ₦{displayRate.toLocaleString()}/nt
              </p>
            )}
          </div>
          <Badge className={cn(statusColor, 'capitalize shrink-0 text-[9px] px-1.5 py-0')}>
            {currentStatus.replace(/_/g, ' ')}
          </Badge>
        </div>

        {(currentStatus === 'occupied' || currentStatus === 'overstay') && guest && (
          <div className="pt-1.5 border-t border-border">
            {organization && (
              <div className="mb-1">
                <div className="flex items-center justify-between gap-0.5">
                  <div className="flex items-center gap-0.5 min-w-0 flex-1">
                    <Building2 className="w-2 h-2 text-primary shrink-0" />
                    <span className="text-[9px] font-medium text-primary truncate">{organization.name}</span>
                  </div>
                </div>
                {orgWallet && (
                  <p className="text-[8px] text-muted-foreground">
                    ₦{orgWallet.balance.toLocaleString()} / ₦{orgWallet.credit_limit.toLocaleString()}
                  </p>
                )}
              </div>
            )}
            <div className="h-6 flex items-center">
              <p className="text-[10px] font-medium text-foreground truncate">
                {extractSurname(guest?.name || 'Guest')}
              </p>
            </div>
          </div>
        )}
      </CardHeader>
    </Card>
    </TooltipProvider>
  );
}
