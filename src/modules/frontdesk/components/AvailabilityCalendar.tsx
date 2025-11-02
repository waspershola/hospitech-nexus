import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle, Clock, XCircle, BedDouble, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoomAvailabilityByDate } from '@/hooks/useRoomAvailabilityByDate';
import { Skeleton } from '@/components/ui/skeleton';

interface AvailabilityCalendarProps {
  onRoomClick?: (roomId: string) => void;
}

export function AvailabilityCalendar({ onRoomClick }: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');

  const { data: roomAvailability, isLoading } = useRoomAvailabilityByDate(
    selectedDate,
    new Date(selectedDate.getTime() + 86400000) // Next day
  );

  const filteredRooms = roomAvailability?.filter((room) => {
    if (typeFilter !== 'all' && room.roomType !== typeFilter) return false;
    if (floorFilter !== 'all' && room.floor?.toString() !== floorFilter) return false;
    return true;
  });

  const availableRooms = filteredRooms?.filter(r => r.status === 'available') || [];
  const reservedRooms = filteredRooms?.filter(r => r.status === 'reserved') || [];
  const occupiedRooms = filteredRooms?.filter(r => r.status === 'occupied') || [];
  const checkingInRooms = filteredRooms?.filter(r => r.status === 'checking_in') || [];
  const checkingOutRooms = filteredRooms?.filter(r => r.status === 'checking_out') || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'reserved': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
      case 'occupied': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      case 'checking_in': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'checking_out': return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
      default: return 'bg-muted border-border';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-3 h-3 mr-1" />Available</Badge>;
      case 'reserved': return <Badge className="bg-yellow-600 hover:bg-yellow-700"><Clock className="w-3 h-3 mr-1" />Reserved</Badge>;
      case 'occupied': return <Badge className="bg-red-600 hover:bg-red-700"><XCircle className="w-3 h-3 mr-1" />Occupied</Badge>;
      case 'checking_in': return <Badge className="bg-blue-600 hover:bg-blue-700"><Clock className="w-3 h-3 mr-1" />Check-in Today</Badge>;
      case 'checking_out': return <Badge className="bg-purple-600 hover:bg-purple-700"><Clock className="w-3 h-3 mr-1" />Check-out Today</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="p-2 rounded-lg bg-primary/10">
          <CalendarIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Room Availability by Date</h3>
          <p className="text-sm text-muted-foreground">View which rooms are available for a specific date</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date-select">Select Date</Label>
            <Input
              id="date-select"
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type-filter">Room Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="double">Double</SelectItem>
                <SelectItem value="suite">Suite</SelectItem>
                <SelectItem value="deluxe">Deluxe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="floor-filter">Floor</Label>
            <Select value={floorFilter} onValueChange={setFloorFilter}>
              <SelectTrigger id="floor-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                <SelectItem value="1">Floor 1</SelectItem>
                <SelectItem value="2">Floor 2</SelectItem>
                <SelectItem value="3">Floor 3</SelectItem>
                <SelectItem value="4">Floor 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{availableRooms.length}</p>
          <p className="text-xs text-green-600 dark:text-green-500">Available</p>
        </Card>
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{reservedRooms.length}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500">Reserved</p>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{occupiedRooms.length}</p>
          <p className="text-xs text-red-600 dark:text-red-500">Occupied</p>
        </Card>
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{checkingInRooms.length}</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">Check-in</p>
        </Card>
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{checkingOutRooms.length}</p>
          <p className="text-xs text-purple-600 dark:text-purple-500">Check-out</p>
        </Card>
      </div>

      {/* Room List */}
      <Card className="p-4 flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredRooms && filteredRooms.length > 0 ? (
            <div className="space-y-2">
              {filteredRooms.map((room) => (
                <div
                  key={room.roomId}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getStatusColor(room.status)}`}
                  onClick={() => onRoomClick?.(room.roomId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background/50">
                        <BedDouble className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Room {room.roomNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {room.categoryName || room.roomType} {room.floor && `• Floor ${room.floor}`}
                        </p>
                        {room.guestName && (
                          <p className="text-xs font-medium mt-1">Guest: {room.guestName}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(room.status)}
                      {room.checkIn && room.checkOut && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(room.checkIn), 'MMM dd')} - {format(new Date(room.checkOut), 'MMM dd')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BedDouble className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rooms found matching the selected filters</p>
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
