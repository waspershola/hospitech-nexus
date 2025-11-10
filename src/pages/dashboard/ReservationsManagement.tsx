import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Phone, Mail, Loader2, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Reservation {
  id: string;
  guest_name: string;
  guest_contact: string | null;
  guest_email: string | null;
  reservation_date: string;
  reservation_time: string;
  number_of_guests: number;
  special_requests: string | null;
  status: string;
  table_number: string | null;
  created_at: string;
}

export default function ReservationsManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.user_metadata?.tenantId;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_contact: '',
    guest_email: '',
    reservation_date: '',
    reservation_time: '',
    number_of_guests: '2',
    special_requests: '',
    status: 'pending',
    table_number: '',
  });

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['restaurant-reservations', tenantId, statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('restaurant_reservations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (dateFilter) {
        query = query.eq('reservation_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!tenantId,
  });

  const createReservation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('restaurant_reservations').insert({
        tenant_id: tenantId,
        ...formData,
        number_of_guests: parseInt(formData.number_of_guests),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-reservations'] });
      toast.success('Reservation created successfully');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create reservation'),
  });

  const updateReservation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Reservation> }) => {
      const { error } = await supabase
        .from('restaurant_reservations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-reservations'] });
      toast.success('Reservation updated successfully');
      resetForm();
      setIsDialogOpen(false);
      setEditingReservation(null);
    },
    onError: () => toast.error('Failed to update reservation'),
  });

  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('restaurant_reservations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-reservations'] });
      toast.success('Reservation deleted successfully');
    },
    onError: () => toast.error('Failed to delete reservation'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReservation) {
      updateReservation.mutate({
        id: editingReservation.id,
        updates: {
          ...formData,
          number_of_guests: parseInt(formData.number_of_guests),
        },
      });
    } else {
      createReservation.mutate();
    }
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormData({
      guest_name: reservation.guest_name,
      guest_contact: reservation.guest_contact || '',
      guest_email: reservation.guest_email || '',
      reservation_date: reservation.reservation_date,
      reservation_time: reservation.reservation_time,
      number_of_guests: reservation.number_of_guests.toString(),
      special_requests: reservation.special_requests || '',
      status: reservation.status,
      table_number: reservation.table_number || '',
    });
    setIsDialogOpen(true);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateReservation.mutate({ id, updates: { status: newStatus } });
  };

  const resetForm = () => {
    setFormData({
      guest_name: '',
      guest_contact: '',
      guest_email: '',
      reservation_date: '',
      reservation_time: '',
      number_of_guests: '2',
      special_requests: '',
      status: 'pending',
      table_number: '',
    });
    setEditingReservation(null);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      seated: 'bg-green-500',
      completed: 'bg-gray-500',
      cancelled: 'bg-red-500',
      no_show: 'bg-orange-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dining Reservations</h1>
          <p className="text-muted-foreground mt-1">
            Manage restaurant reservations and table bookings
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingReservation ? 'Edit' : 'Create'} Reservation</DialogTitle>
              <DialogDescription>
                {editingReservation ? 'Update reservation details' : 'Create a new dining reservation'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guest_name">Guest Name *</Label>
                  <Input
                    id="guest_name"
                    value={formData.guest_name}
                    onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_guests">Number of Guests *</Label>
                  <Input
                    id="number_of_guests"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.number_of_guests}
                    onChange={(e) => setFormData({ ...formData, number_of_guests: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guest_contact">Phone Number</Label>
                  <Input
                    id="guest_contact"
                    type="tel"
                    value={formData.guest_contact}
                    onChange={(e) => setFormData({ ...formData, guest_contact: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest_email">Email</Label>
                  <Input
                    id="guest_email"
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reservation_date">Date *</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    min={today}
                    value={formData.reservation_date}
                    onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservation_time">Time *</Label>
                  <Input
                    id="reservation_time"
                    type="time"
                    value={formData.reservation_time}
                    onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="seated">Seated</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="table_number">Table Number</Label>
                  <Input
                    id="table_number"
                    value={formData.table_number}
                    onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                    placeholder="e.g., T12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_requests">Special Requests</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createReservation.isPending || updateReservation.isPending}>
                  {(createReservation.isPending || updateReservation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingReservation ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter reservations by status and date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="seated">Seated</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-filter">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reservations found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reservations.map((reservation) => (
            <Card key={reservation.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">{reservation.guest_name}</h3>
                      <Badge className={getStatusColor(reservation.status)}>
                        {reservation.status.replace('_', ' ')}
                      </Badge>
                      {reservation.table_number && (
                        <Badge variant="outline">Table {reservation.table_number}</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(reservation.reservation_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {reservation.reservation_time}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {reservation.number_of_guests} {reservation.number_of_guests === 1 ? 'Guest' : 'Guests'}
                      </div>
                    </div>

                    {(reservation.guest_contact || reservation.guest_email) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {reservation.guest_contact && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {reservation.guest_contact}
                          </div>
                        )}
                        {reservation.guest_email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {reservation.guest_email}
                          </div>
                        )}
                      </div>
                    )}

                    {reservation.special_requests && (
                      <div className="text-sm bg-muted/50 p-3 rounded-lg">
                        <strong>Special Requests:</strong> {reservation.special_requests}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {reservation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="whitespace-nowrap"
                          onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="whitespace-nowrap"
                          onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                    {reservation.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(reservation.id, 'seated')}
                      >
                        Seat Guest
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(reservation)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Delete this reservation?')) {
                          deleteReservation.mutate(reservation.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
