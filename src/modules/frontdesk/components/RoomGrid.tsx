import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoomTile } from './RoomTile';
import { Loader2 } from 'lucide-react';

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

  const { data: rooms, isLoading } = useQuery({
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
        .not('bookings.status', 'in', '(completed,cancelled)')
        .gte('bookings.check_out', new Date().toISOString().split('T')[0])
        .order('number', { ascending: true });

      // Don't filter overstay at database level (it's a computed status)
      if (statusFilter && statusFilter !== 'overstay') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }

      if (floorFilter !== null) {
        query = query.eq('floor', floorFilter);
      }

      if (searchQuery) {
        query = query.or(`number.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data || [];
      
      // Filter by organization if needed (client-side since it's in nested data)
      if (organizationFilter && data) {
        filteredData = data.filter(room => {
          if (!room.bookings || room.bookings.length === 0) return false;
          const activeBooking = room.bookings.find((b: any) => 
            b.organization_id === organizationFilter
          );
          return !!activeBooking;
        });
      }
      
      // Handle overstay filtering (client-side computed status)
      if (statusFilter === 'overstay') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        filteredData = filteredData.filter(room => {
          if (!room.bookings || room.bookings.length === 0) return false;
          
          const activeBooking = room.bookings.find((b: any) => 
            b.status === 'checked_in' && 
            new Date(b.check_out) < today
          );
          
          return !!activeBooking;
        });
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
            
            // Get total paid for this booking
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
      
      // Additional client-side search for guest names if searchQuery exists
      if (searchQuery && filteredData) {
        const searchLower = searchQuery.toLowerCase();
        filteredData = filteredData.filter(room => {
          // Search by room number (already done server-side but keep for consistency)
          if (room.number.toLowerCase().includes(searchLower)) return true;
          
          // Search by guest name in active bookings
          if (room.bookings && room.bookings.length > 0) {
            const hasMatchingGuest = room.bookings.some((b: any) => 
              (b.status === 'checked_in' || b.status === 'reserved') &&
              b.guest?.name?.toLowerCase().includes(searchLower)
            );
            if (hasMatchingGuest) return true;
          }
          
          return false;
        });
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
