import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoomTile } from './RoomTile';
import { Loader2 } from 'lucide-react';

interface RoomGridProps {
  searchQuery?: string;
  statusFilter?: string | null;
  typeFilter?: string | null;
  onRoomClick: (roomId: string) => void;
}

export function RoomGrid({ searchQuery, statusFilter, typeFilter, onRoomClick }: RoomGridProps) {
  const { tenantId } = useAuth();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms-grid', tenantId, searchQuery, statusFilter, typeFilter],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('rooms')
        .select(`
          *,
          category:room_categories(name, short_code, base_rate)
        `)
        .eq('tenant_id', tenantId)
        .order('number', { ascending: true });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }

      if (searchQuery) {
        query = query.ilike('number', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
