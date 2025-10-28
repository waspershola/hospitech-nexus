import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Room {
  id: string;
  number: string;
  type: string;
  status: string;
  rate: number;
  floor: number;
}

export default function Rooms() {
  const { tenantId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('number');

      if (!error && data) {
        setRooms(data);
      }
      setLoading(false);
    };

    fetchRooms();

    // Real-time subscription
    const channel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'occupied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading rooms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-charcoal mb-2">Rooms</h1>
          <p className="text-muted-foreground">Manage your hotel rooms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-charcoal">Room {room.number}</h3>
                <p className="text-sm text-muted-foreground">Floor {room.floor}</p>
              </div>
              <Badge className={getStatusColor(room.status)}>
                {room.status}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Type:</span> {room.type}
              </p>
              <p className="text-sm">
                <span className="font-medium">Rate:</span> ${room.rate}/night
              </p>
            </div>
          </Card>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No rooms found. Create your first room to get started.
        </div>
      )}
    </div>
  );
}