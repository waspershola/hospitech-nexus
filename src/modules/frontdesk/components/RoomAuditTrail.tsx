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
      return data;
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
            {entry.reason && (
              <p className="text-xs text-muted-foreground mt-1">{entry.reason}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
