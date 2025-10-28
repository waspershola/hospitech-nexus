import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CreditCard, IdCard, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomTileProps {
  room: any;
  onClick: () => void;
}

const statusColors = {
  available: 'bg-green-500 text-white',
  occupied: 'bg-red-500 text-white',
  reserved: 'bg-blue-500 text-white',
  cleaning: 'bg-orange-500 text-white',
  maintenance: 'bg-gray-500 text-white',
};

const statusBorderColors = {
  available: 'border-green-200 hover:border-green-400',
  occupied: 'border-red-200 hover:border-red-400',
  reserved: 'border-blue-200 hover:border-blue-400',
  cleaning: 'border-orange-200 hover:border-orange-400',
  maintenance: 'border-gray-200 hover:border-gray-400',
};

export function RoomTile({ room, onClick }: RoomTileProps) {
  const statusColor = statusColors[room.status as keyof typeof statusColors] || statusColors.available;
  const borderColor = statusBorderColors[room.status as keyof typeof statusBorderColors] || statusBorderColors.available;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg border-2',
        borderColor
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-xl font-bold text-foreground">Room {room.number}</h3>
            <p className="text-sm text-muted-foreground">
              {room.category?.name || room.type || 'Standard'}
            </p>
          </div>
          <Badge className={statusColor}>
            {room.status}
          </Badge>
        </div>

        {room.status === 'occupied' && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm font-medium text-foreground">Guest Name</p>
            <p className="text-xs text-muted-foreground mt-1">Balance: ₦0.00</p>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {room.status === 'cleaning' && (
            <div className="p-1.5 rounded bg-orange-100">
              <Sparkles className="w-4 h-4 text-orange-600" />
            </div>
          )}
          {room.status === 'occupied' && (
            <>
              <div className="p-1.5 rounded bg-blue-100">
                <IdCard className="w-4 h-4 text-blue-600" />
              </div>
              <div className="p-1.5 rounded bg-green-100">
                <CreditCard className="w-4 h-4 text-green-600" />
              </div>
            </>
          )}
          {room.status === 'maintenance' && (
            <div className="p-1.5 rounded bg-gray-100">
              <Wrench className="w-4 h-4 text-gray-600" />
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
