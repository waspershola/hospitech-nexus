import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter } from 'lucide-react';
import { useBookingSearch, type BookingFilters } from '@/hooks/useBookingSearch';
import { BookingFlow } from '@/modules/bookings/BookingFlow';
import { toast } from 'sonner';

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  guest_id: string;
  room_id: string;
  booking_reference?: string;
  source?: string;
  notes?: string;
  guests: { id: string; name: string };
  rooms: { id: string; number: string; type: string };
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
  const queryClient = useQueryClient();
  const [isBookingFlowOpen, setIsBookingFlowOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BookingFilters>({});

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, guests(id, name), rooms(id, number, type)')
        .eq('tenant_id', tenantId)
        .order('check_in', { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!tenantId,
  });

  const filteredBookings = useBookingSearch(bookings, searchTerm, filters);

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
        <Button onClick={() => setIsBookingFlowOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* Unified Booking Flow */}
      <BookingFlow 
        open={isBookingFlowOpen} 
        onClose={() => {
          setIsBookingFlowOpen(false);
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }}
      />

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, room, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="checked-out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Source</Label>
              <Select
                value={filters.source || 'all'}
                onValueChange={(value) => setFilters({ ...filters, source: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="front_desk">Front Desk</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Room Type</Label>
              <Select
                value={filters.roomType || 'all'}
                onValueChange={(value) => setFilters({ ...filters, roomType: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Array.from(new Set(bookings.map(b => b.rooms?.type).filter(Boolean))).map((type) => (
                    <SelectItem key={type} value={type!}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({});
                  setSearchTerm('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-sm">{booking.booking_reference || '-'}</TableCell>
                <TableCell className="font-medium">{booking.guests?.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{booking.rooms?.number}</span>
                    <span className="text-xs text-muted-foreground">{booking.rooms?.type}</span>
                  </div>
                </TableCell>
                <TableCell>{new Date(booking.check_in).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(booking.check_out).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(booking.status)}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {booking.source?.replace('_', ' ') || 'front desk'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">₦{Number(booking.total_amount).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className="text-sm text-muted-foreground">View in Front Desk</span>
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
        
        {bookings.length > 0 && filteredBookings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No bookings match your search criteria.
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Bookings cannot be deleted from this page. Please use the Front Desk to cancel or modify bookings through the proper workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}