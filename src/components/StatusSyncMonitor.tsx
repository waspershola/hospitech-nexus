import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function StatusSyncMonitor() {
  const { tenantId } = useAuth();
  const [isResyncing, setIsResyncing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['sync-health-check', tenantId],
    queryFn: async () => {
      if (!tenantId) return { availableWithBookings: [], reservedWithoutBookings: [] };

      // Find available rooms with active reservations
      const { data: availableRooms } = await supabase
        .from('rooms')
        .select('id, number, bookings(id, status, check_out)')
        .eq('status', 'available')
        .eq('tenant_id', tenantId);

      const availableWithBookings = availableRooms?.filter((r: any) => {
        const bookingsArray = Array.isArray(r.bookings) ? r.bookings : r.bookings ? [r.bookings] : [];
        return bookingsArray.some(
          (b: any) =>
            b.status === 'reserved' &&
            new Date(b.check_out) > new Date()
        );
      }) || [];

      // Find reserved rooms without active reservations
      const { data: reservedRooms } = await supabase
        .from('rooms')
        .select('id, number, bookings(id, status, check_out)')
        .eq('status', 'reserved')
        .eq('tenant_id', tenantId);

      const reservedWithoutBookings = reservedRooms?.filter((r: any) => {
        const bookingsArray = Array.isArray(r.bookings) ? r.bookings : r.bookings ? [r.bookings] : [];
        return !bookingsArray.some(
          (b: any) =>
            b.status === 'reserved' &&
            new Date(b.check_out) > new Date()
        );
      }) || [];

      return { availableWithBookings, reservedWithoutBookings };
    },
    enabled: !!tenantId,
    refetchInterval: 60000, // Check every minute
  });

  const handleForceResync = async () => {
    if (!data || !tenantId) return;

    setIsResyncing(true);
    try {
      const mismatched = [
        ...(data.availableWithBookings || []),
        ...(data.reservedWithoutBookings || []),
      ];

      // Trigger database trigger by updating each room's metadata
      for (const room of mismatched) {
        await supabase
          .from('rooms')
          .update({ 
            metadata: { last_sync_check: new Date().toISOString() } 
          })
          .eq('id', room.id);
      }

      toast.success('Sync Complete', {
        description: `Fixed ${mismatched.length} mismatched rooms`,
      });

      refetch();
    } catch (error) {
      toast.error('Sync Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsResyncing(false);
    }
  };

  if (!data) return null;

  const mismatchCount =
    (data.availableWithBookings?.length || 0) +
    (data.reservedWithoutBookings?.length || 0);

  if (mismatchCount === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          ⚠️ Sync Issue Detected — {mismatchCount} room{mismatchCount > 1 ? 's' : ''} with mismatched status
          {data.availableWithBookings && data.availableWithBookings.length > 0 && (
            <> ({data.availableWithBookings.map((r: any) => r.number).join(', ')} show available but reserved)</>
          )}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleForceResync}
          disabled={isResyncing}
        >
          {isResyncing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Fixing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Re-Sync
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
