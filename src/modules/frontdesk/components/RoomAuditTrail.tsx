import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface RoomAuditTrailProps {
  roomId: string;
}

export function RoomAuditTrail({ roomId }: RoomAuditTrailProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['room-status-history', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_status_history')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Enrich with booking and staff context
      const enrichedData = await Promise.all(
        (data || []).map(async (entry) => {
          // Fetch staff who made the change
          let changedByName = null;
          if (entry.changed_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', entry.changed_by)
              .maybeSingle();
            changedByName = profile?.full_name;
          }
          
          // Fetch booking context at the time of status change
          const { data: booking } = await supabase
            .from('bookings')
            .select(`
              id,
              check_in,
              check_out,
              guest:guests(name)
            `)
            .eq('room_id', roomId)
            .lte('check_in', entry.created_at)
            .gte('check_out', entry.created_at)
            .maybeSingle();
          
          return {
            ...entry,
            booking,
            changed_by_name: changedByName,
          };
        })
      );
      
      return enrichedData;
    },
    enabled: !!roomId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div key={entry.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex-shrink-0 w-1 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {entry.old_status} → {entry.new_status}
              </p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(entry.created_at), 'MMM dd, HH:mm')}
              </p>
            </div>
            
            {/* Show guest context */}
            {entry.booking?.guest?.name && (
              <p className="text-xs text-muted-foreground mt-1">
                Guest: {entry.booking.guest.name}
              </p>
            )}
            
            {/* Show action context */}
            {entry.reason && (
              <p className="text-xs text-muted-foreground">{entry.reason}</p>
            )}
            
            {/* Show staff who made change */}
            {entry.changed_by_name && (
              <p className="text-xs text-muted-foreground">
                By: {entry.changed_by_name}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
