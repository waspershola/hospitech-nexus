import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RoomDropdownProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function RoomDropdown({ value, onChange }: RoomDropdownProps) {
  const { tenantId } = useAuth();
  
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms-dropdown', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, number, status')
        .eq('tenant_id', tenantId)
        .not('status', 'eq', 'out_of_order')
        .order('number', { ascending: true });
      
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
        {rooms.map(room => (
          <SelectItem key={room.id} value={room.id}>
            Room {room.number} ({room.status})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
