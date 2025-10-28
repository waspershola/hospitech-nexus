import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  guests: { name: string };
  rooms: { number: string };
}

export default function Bookings() {
  const { tenantId } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guests(name),
          rooms(number)
        `)
        .eq('tenant_id', tenantId)
        .order('check_in', { ascending: false });

      if (!error && data) {
        setBookings(data);
      }
      setLoading(false);
    };

    fetchBookings();
  }, [tenantId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-charcoal mb-2">Bookings</h1>
        <p className="text-muted-foreground">Manage reservations and check-ins</p>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">{booking.guests?.name}</TableCell>
                <TableCell>{booking.rooms?.number}</TableCell>
                <TableCell>{new Date(booking.check_in).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(booking.check_out).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">${booking.total_amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {bookings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No bookings found.
          </div>
        )}
      </Card>
    </div>
  );
}