import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RoomDropdownProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

interface RoomDropdownProps {
  value: string | undefined;
  onChange: (value: string) => void;
  excludeOccupied?: boolean; // For new QR creation, exclude occupied rooms
}

export function RoomDropdown({ value, onChange, excludeOccupied = false }: RoomDropdownProps) {
  const { tenantId } = useAuth();
  
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms-dropdown', tenantId, excludeOccupied],
    queryFn: async () => {
      let query = supabase
        .from('rooms')
        .select('id, number, status')
        .eq('tenant_id', tenantId)
        .not('status', 'eq', 'out_of_order');
      
      // When creating new QR codes, exclude occupied rooms
      if (excludeOccupied) {
        query = query.not('status', 'eq', 'occupied');
      }
      
      const { data, error } = await query.order('number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="bg-background">
        <SelectValue placeholder={isLoading ? 'Loading rooms...' : 'Select room'} />
      </SelectTrigger>
      <SelectContent className="bg-background z-50">
        {rooms.length === 0 && !isLoading ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            {excludeOccupied ? 'No available rooms' : 'No rooms found'}
          </div>
        ) : (
          rooms.map(room => (
            <SelectItem key={room.id} value={room.id}>
              Room {room.number} ({room.status})
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
