import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, CreditCard, IdCard, Wrench, Building2, AlertTriangle, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';

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
};

const statusBorderColors = {
  available: 'border-[hsl(var(--status-available)/0.3)] hover:border-[hsl(var(--status-available))]',
  occupied: 'border-[hsl(var(--status-occupied)/0.3)] hover:border-[hsl(var(--status-occupied))]',
  reserved: 'border-[hsl(var(--status-reserved)/0.3)] hover:border-[hsl(var(--status-reserved))]',
  cleaning: 'border-[hsl(var(--status-dirty)/0.3)] hover:border-[hsl(var(--status-dirty))]',
  maintenance: 'border-[hsl(var(--status-oos)/0.3)] hover:border-[hsl(var(--status-oos))]',
  overstay: 'border-[hsl(var(--status-overstay)/0.3)] hover:border-[hsl(var(--status-overstay))]',
};

export function RoomTile({ room, onClick, isSelectionMode, isSelected, onSelectionChange }: RoomTileProps) {
  const statusColor = statusColors[room.status as keyof typeof statusColors] || statusColors.available;
  const borderColor = statusBorderColors[room.status as keyof typeof statusBorderColors] || statusBorderColors.available;

  // Phase 2: Prioritize TODAY's active booking over canonical fields
  const bookingsArray = Array.isArray(room.bookings) ? room.bookings : room.bookings ? [room.bookings] : [];
  const today = new Date().toISOString().split('T')[0];
  
  // Priority 1: Checked-in booking active today
  let activeBooking = bookingsArray.find(
    (b: any) => b.status === 'checked_in' && 
    b.check_in?.split('T')[0] <= today && 
    b.check_out?.split('T')[0] > today
  );
  
  // Priority 2: Reserved booking arriving today
  if (!activeBooking) {
    activeBooking = bookingsArray.find(
      (b: any) => b.status === 'reserved' && 
      b.check_in?.split('T')[0] === today
    );
  }
  
  // Priority 3: Use canonical booking (fallback for future bookings)
  if (!activeBooking && room.current_reservation_id) {
    activeBooking = bookingsArray.find((b: any) => b.id === room.current_reservation_id);
  }
  
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

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          'cursor-pointer transition-all duration-200 active:scale-95 border-2 rounded-lg sm:rounded-xl relative touch-manipulation',
          'lg:hover:shadow-md lg:hover:scale-[1.01] min-h-[130px] flex flex-col',
          borderColor,
          isSelected && 'ring-2 ring-primary ring-offset-2'
        )}
        onClick={handleClick}
      >
      <CardHeader className="p-2 sm:p-3 flex-1 flex flex-col justify-between">
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
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground">Room {room.number}</h3>
              {hasDND && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1 rounded-full bg-muted">
                      <BellOff className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Do Not Disturb</TooltipContent>
                </Tooltip>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-muted-foreground cursor-help truncate">
                  {room.category?.name || room.type || 'Standard'}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>Max {room.category?.max_occupancy || 2} guest{(room.category?.max_occupancy || 2) !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
            {displayRate > 0 && (
              <p className="text-xs font-semibold text-primary mt-0.5">
                ₦{displayRate.toLocaleString()}/night
              </p>
            )}
          </div>
          <Badge className={cn(statusColor, 'capitalize shrink-0')}>
            {room.status}
          </Badge>
        </div>

        {(room.status === 'occupied' || room.status === 'overstay') && guest && (
          <div className="mt-2 pt-2 border-t border-border">
            {organization && (
              <div className="mb-1.5">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[10px] font-medium text-primary truncate">{organization.name}</span>
                  </div>
                  {orgWallet?.nearLimit && (
                    <AlertTriangle className="w-2.5 h-2.5 text-yellow-500" />
                  )}
                  {orgWallet?.overLimit && (
                    <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                  )}
                </div>
                {orgWallet && (
                  <p className="text-[9px] text-muted-foreground">
                    Wallet: ₦{orgWallet.balance.toLocaleString()} / ₦{orgWallet.credit_limit.toLocaleString()}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs font-medium text-foreground truncate">
              {guest?.name || 'Guest'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Balance: ₦{totalAmount.toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-1.5 mt-2">
          {room.status === 'cleaning' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 rounded bg-[hsl(var(--status-dirty)/0.1)] cursor-help">
                  <Sparkles className="w-3 h-3 text-[hsl(var(--status-dirty))]" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Needs housekeeping</TooltipContent>
            </Tooltip>
          )}
          {(room.status === 'occupied' || room.status === 'overstay') && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1 rounded bg-[hsl(var(--status-reserved)/0.1)] cursor-help">
                    <IdCard className="w-3 h-3 text-[hsl(var(--status-reserved))]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>ID on file</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1 rounded bg-[hsl(var(--success)/0.1)] cursor-help">
                    <CreditCard className="w-3 h-3 text-[hsl(var(--success))]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Has deposit/balance</TooltipContent>
              </Tooltip>
            </>
          )}
          {room.status === 'maintenance' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 rounded bg-[hsl(var(--status-oos)/0.1)] cursor-help">
                  <Wrench className="w-3 h-3 text-[hsl(var(--status-oos))]" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Under maintenance</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
    </Card>
    </TooltipProvider>
  );
}
