import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoomTile } from './RoomTile';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRoomStatusNow } from '@/lib/roomAvailability';
import { useOperationsHours } from '@/hooks/useOperationsHours';

interface RoomGridProps {
  searchQuery?: string;
  statusFilter?: string | null;
  categoryFilter?: string | null;
  floorFilter?: number | null;
  organizationFilter?: string | null;
  onRoomClick: (roomId: string) => void;
  isSelectionMode?: boolean;
  selectedRoomIds?: string[];
  onRoomSelectionChange?: (roomId: string, selected: boolean) => void;
}

export function RoomGrid({ searchQuery, statusFilter, categoryFilter, floorFilter, organizationFilter, onRoomClick, isSelectionMode, selectedRoomIds = [], onRoomSelectionChange }: RoomGridProps) {
  const { tenantId } = useAuth();
  const { data: operationsHours } = useOperationsHours();

  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['rooms-grid', tenantId, searchQuery, statusFilter, categoryFilter, floorFilter, organizationFilter],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('rooms')
        .select(`
          *,
          category:room_categories(name, short_code, base_rate, max_occupancy),
          bookings!bookings_room_id_fkey(
            id,
            check_in,
            check_out,
            status,
            total_amount,
            guest_id,
            organization_id,
            guest:guests(id, name, email, phone),
            organization:organizations(id, name, credit_limit, allow_negative_balance)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('number', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      
      const checkInTime = operationsHours?.checkInTime || '14:00';
      const checkOutTime = operationsHours?.checkOutTime || '12:00';
      const now = new Date();
      
      // Process rooms with time-aware status logic
      let filteredData = (data || []).map(room => {
        if (!room.bookings || room.bookings.length === 0) return room;
        
        // Find the active booking for NOW (current time)
        const activeBooking = room.bookings
          .filter((b: any) => !['completed', 'cancelled'].includes(b.status))
          .find((b: any) => {
            const checkInDT = new Date(b.check_in);
            const checkOutDT = new Date(b.check_out);
            return checkInDT <= now && checkOutDT > now;
          });
        
        // Use centralized status logic (pass the booking with room_id added)
        const bookingWithRoomId = activeBooking ? { ...activeBooking, room_id: room.id } : null;
        const currentStatus = getRoomStatusNow(room, bookingWithRoomId, checkInTime, checkOutTime);
        
        return { 
          ...room, 
          bookings: activeBooking ? [activeBooking] : [],
          status: currentStatus 
        };
      });

      // Apply room-level filters
      if (statusFilter && statusFilter !== 'overstay' && statusFilter !== 'pending_payments') {
        filteredData = filteredData.filter(room => room.status === statusFilter);
      }

      if (categoryFilter) {
        filteredData = filteredData.filter(room => room.category_id === categoryFilter);
      }

      if (floorFilter !== null) {
        filteredData = filteredData.filter(room => room.floor === floorFilter);
      }

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        filteredData = filteredData.filter(room => 
          room.number.toLowerCase().includes(searchLower) ||
          room.bookings?.some((b: any) => 
            b.guest?.name?.toLowerCase().includes(searchLower)
          )
        );
      }
      
      // Filter by organization if needed
      if (organizationFilter) {
        filteredData = filteredData.filter(room => {
          if (!room.bookings || room.bookings.length === 0) return false;
          return room.bookings.some((b: any) => b.organization_id === organizationFilter);
        });
      }
      
      // Handle overstay filtering - already handled by getRoomStatusNow
      if (statusFilter === 'overstay') {
        filteredData = filteredData.filter(room => room.status === 'overstay');
      }
      
      // Handle pending payments filtering
      if (statusFilter === 'pending_payments') {
        const roomsWithBalance = await Promise.all(
          filteredData.map(async (room) => {
            const bookings = Array.isArray(room.bookings) ? room.bookings : [];
            const activeBooking = bookings.find((b: any) => 
              ['reserved', 'checked_in', 'occupied'].includes(b.status)
            );
            
            if (!activeBooking) return null;
            
            const { data: payments } = await supabase
              .from('payments')
              .select('amount')
              .eq('booking_id', activeBooking.id)
              .in('status', ['paid', 'success', 'completed']);
            
            const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Number(activeBooking.total_amount) - totalPaid;
            
            return balance > 0 ? room : null;
          })
        );
        
        filteredData = roomsWithBalance.filter(r => r !== null);
      }
      
      return filteredData;
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Phase 7: Error boundary
  if (error) {
    console.error('RoomGrid error:', error);
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
        <div>
          <p className="text-destructive font-medium mb-2">Failed to load rooms</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No rooms found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
      {rooms.map((room) => (
        <RoomTile 
          key={room.id} 
          room={room}
          onClick={() => onRoomClick(room.id)}
          isSelectionMode={isSelectionMode}
          isSelected={selectedRoomIds.includes(room.id)}
          onSelectionChange={(selected) => onRoomSelectionChange?.(room.id, selected)}
        />
      ))}
    </div>
  );
}
