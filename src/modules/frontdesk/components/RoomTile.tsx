import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, CreditCard, IdCard, Wrench, Building2, AlertTriangle } from 'lucide-react';
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

  // Get active booking with guest and organization info
  const activeBooking = room.bookings?.find((b: any) => 
    b.status === 'checked_in' || b.status === 'reserved'
  );
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

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-300 hover:shadow-luxury hover:scale-[1.02] border-2 rounded-2xl relative',
        borderColor,
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={handleClick}
    >
      <CardHeader className="p-4">
        {isSelectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border-2"
            />
          </div>
        )}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold font-display text-foreground">Room {room.number}</h3>
              {room.category?.short_code && (
                <Badge variant="outline" className="text-xs border-accent text-accent-foreground">
                  {room.category.short_code}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {room.category?.name || room.type || 'Standard'}
            </p>
            {displayRate > 0 && (
              <p className="text-sm font-semibold text-primary mt-1">
                ₦{displayRate.toLocaleString()}/night
              </p>
            )}
            {room.category?.max_occupancy && (
              <p className="text-xs text-muted-foreground">
                Max {room.category.max_occupancy} guest{room.category.max_occupancy !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Badge className={cn(statusColor, 'capitalize')}>
            {room.status}
          </Badge>
        </div>

        {(room.status === 'occupied' || room.status === 'overstay') && (
          <div className="mt-3 pt-3 border-t border-border">
            {organization && (
              <div className="mb-2">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">{organization.name}</span>
                  </div>
                  {orgWallet?.nearLimit && (
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  )}
                  {orgWallet?.overLimit && (
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                  )}
                </div>
                {orgWallet && (
                  <p className="text-[10px] text-muted-foreground">
                    Wallet: ₦{orgWallet.balance.toLocaleString()} / ₦{orgWallet.credit_limit.toLocaleString()}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm font-medium text-foreground">
              {guest?.name || 'Guest'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Balance: ₦{totalAmount.toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {room.status === 'cleaning' && (
            <div className="p-1.5 rounded-lg bg-[hsl(var(--status-dirty)/0.1)]">
              <Sparkles className="w-4 h-4 text-[hsl(var(--status-dirty))]" />
            </div>
          )}
          {(room.status === 'occupied' || room.status === 'overstay') && (
            <>
              <div className="p-1.5 rounded-lg bg-[hsl(var(--status-reserved)/0.1)]">
                <IdCard className="w-4 h-4 text-[hsl(var(--status-reserved))]" />
              </div>
              <div className="p-1.5 rounded-lg bg-[hsl(var(--success)/0.1)]">
                <CreditCard className="w-4 h-4 text-[hsl(var(--success))]" />
              </div>
            </>
          )}
          {room.status === 'maintenance' && (
            <div className="p-1.5 rounded-lg bg-[hsl(var(--status-oos)/0.1)]">
              <Wrench className="w-4 h-4 text-[hsl(var(--status-oos))]" />
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
