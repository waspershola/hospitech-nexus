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
}

export function RoomGrid({ searchQuery, statusFilter, categoryFilter, floorFilter, organizationFilter, onRoomClick }: RoomGridProps) {
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
            organization_id,
            organizations(id, name)
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
        query = query.ilike('number', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by organization if needed (client-side since it's in nested data)
      if (organizationFilter && data) {
        return data.filter(room => {
          if (!room.bookings || room.bookings.length === 0) return false;
          const activeBooking = room.bookings.find((b: any) => 
            b.organization_id === organizationFilter
          );
          return !!activeBooking;
        });
      }
      
      return data;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {rooms.map((room) => (
        <RoomTile 
          key={room.id} 
          room={room}
          onClick={() => onRoomClick(room.id)}
        />
      ))}
    </div>
  );
}
