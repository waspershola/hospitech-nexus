import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RoomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RoomDropdown({ value, onChange, placeholder = "Select a room" }: RoomDropdownProps) {
  const { tenantId } = useAuth();
  
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms-dropdown', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('rooms')
        .select('id, number, status')
        .eq('tenant_id', tenantId)
        .order('number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading rooms..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {rooms.map((room) => (
          <SelectItem key={room.id} value={room.id}>
            Room {room.number} {room.status !== 'available' && `(${room.status})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
