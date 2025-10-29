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
        .order('number', { ascending: true });

      if (statusFilter) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 pb-20 lg:pb-0">
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
