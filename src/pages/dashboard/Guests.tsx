import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export default function Guests() {
  const { tenantId } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchGuests = async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGuests(data);
      }
      setLoading(false);
    };

    fetchGuests();
  }, [tenantId]);

  if (loading) {
    return <div className="text-center py-12">Loading guests...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-charcoal mb-2">Guests</h1>
        <p className="text-muted-foreground">View and manage guest information</p>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell className="font-medium">{guest.name}</TableCell>
                <TableCell>{guest.email || '-'}</TableCell>
                <TableCell>{guest.phone || '-'}</TableCell>
                <TableCell>{new Date(guest.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {guests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No guests found.
          </div>
        )}
      </Card>
    </div>
  );
}