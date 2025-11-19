import { format } from 'date-fns';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RoomAvailabilityStatus } from '@/hooks/useRoomAvailability';

interface Room {
  id: string;
  number: string;
  category?: {
    name: string;
  };
}

interface RoomAvailabilityGridProps {
  rooms: Room[];
  availabilityMap: Map<string, RoomAvailabilityStatus>;
  selectedRoomIds: string[];
  checkIn: Date | null;
  checkOut: Date | null;
}

export function RoomAvailabilityGrid({
  rooms,
  availabilityMap,
  selectedRoomIds,
  checkIn,
  checkOut,
}: RoomAvailabilityGridProps) {
  if (!checkIn || !checkOut) {
    return null;
  }

  const selectedRooms = rooms.filter((room) => selectedRoomIds.includes(room.id));
  const availableCount = selectedRooms.filter(
    (room) => availabilityMap.get(room.id)?.isAvailable
  ).length;
  const unavailableCount = selectedRooms.length - availableCount;

  if (selectedRooms.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Availability Summary
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {availableCount} Available
            </Badge>
            {unavailableCount > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <XCircle className="w-3 h-3 mr-1" />
                {unavailableCount} Unavailable
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground mb-3">
          {format(checkIn, 'MMM dd, yyyy')} - {format(checkOut, 'MMM dd, yyyy')}
        </div>
        
        <div className="space-y-2">
          {selectedRooms.map((room) => {
            const status = availabilityMap.get(room.id);
            const isAvailable = status?.isAvailable ?? true;

            return (
              <div
                key={room.id}
                className={`flex items-center justify-between p-2 rounded-md border transition-colors ${
                  isAvailable
                    ? 'bg-success/5 border-success/20'
                    : 'bg-destructive/5 border-destructive/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isAvailable ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <div>
                    <div className="text-sm font-medium">Room {room.number}</div>
                    {room.category?.name && (
                      <div className="text-xs text-muted-foreground">{room.category.name}</div>
                    )}
                  </div>
                </div>

                {!isAvailable && status?.conflictingBookingRef && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <Info className="w-3 h-3" />
                          Conflict
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Conflicting booking: {status.conflictingBookingRef}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </div>

        {unavailableCount > 0 && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-xs text-destructive font-medium">
              ⚠️ {unavailableCount} room{unavailableCount > 1 ? 's are' : ' is'} unavailable for the selected dates. 
              Please remove {unavailableCount > 1 ? 'them' : 'it'} to continue.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
