import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, LogIn, LogOut } from 'lucide-react';

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  guest_id: string;
  room_id: string;
  guests: { id: string; name: string };
  rooms: { id: string; number: string };
}

interface Guest {
  id: string;
  name: string;
}

interface Room {
  id: string;
  number: string;
  rate: number;
}

export default function Bookings() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    guest_id: '',
    room_id: '',
    check_in: '',
    check_out: '',
    total_amount: '',
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, guests(id, name), rooms(id, number)')
        .eq('tenant_id', tenantId)
        .order('check_in', { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!tenantId,
  });

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return data as Guest[];
    },
    enabled: !!tenantId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, number, rate')
        .eq('tenant_id', tenantId)
        .eq('status', 'available')
        .order('number');
      if (error) throw error;
      return data as Room[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('bookings').insert({
        ...data,
        total_amount: parseFloat(data.total_amount),
        tenant_id: tenantId,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Booking created successfully' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating booking', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('bookings')
        .update({
          ...data,
          total_amount: parseFloat(data.total_amount),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Booking updated successfully' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating booking', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Booking deleted successfully' });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting booking', description: error.message, variant: 'destructive' });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').update({ status: 'checked-in' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Guest checked in successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error checking in', description: error.message, variant: 'destructive' });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').update({ status: 'checked-out' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Guest checked out successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error checking out', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ guest_id: '', room_id: '', check_in: '', check_out: '', total_amount: '' });
    setEditingBooking(null);
  };

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      guest_id: booking.guest_id,
      room_id: booking.room_id,
      check_in: booking.check_in.split('T')[0],
      check_out: booking.check_out.split('T')[0],
      total_amount: booking.total_amount.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBooking) {
      updateMutation.mutate({ id: editingBooking.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'checked-in':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'checked-out':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display text-foreground mb-2">Bookings</h1>
          <p className="text-muted-foreground">Manage reservations and check-ins</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> New Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBooking ? 'Edit Booking' : 'Create Booking'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest_id">Guest</Label>
                <Select value={formData.guest_id} onValueChange={(value) => setFormData({ ...formData, guest_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select guest" />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map((guest) => (
                      <SelectItem key={guest.id} value={guest.id}>
                        {guest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_id">Room</Label>
                <Select value={formData.room_id} onValueChange={(value) => setFormData({ ...formData, room_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.number} - ${room.rate}/night
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_in">Check-in Date</Label>
                <Input
                  id="check_in"
                  type="date"
                  value={formData.check_in}
                  onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out">Check-out Date</Label>
                <Input
                  id="check_out"
                  type="date"
                  value={formData.check_out}
                  onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBooking ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {booking.status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => checkInMutation.mutate(booking.id)}>
                        <LogIn className="h-4 w-4" />
                      </Button>
                    )}
                    {booking.status === 'checked-in' && (
                      <Button size="sm" variant="outline" onClick={() => checkOutMutation.mutate(booking.id)}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                    {booking.status !== 'checked-out' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(booking)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(booking.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {bookings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No bookings found. Create your first booking to get started.
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}