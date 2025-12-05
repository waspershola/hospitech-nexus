import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, User, Search, Eye } from 'lucide-react';
import { useGuestSearch } from '@/hooks/useGuestSearch';
import { isElectronContext } from '@/lib/environment/isElectron';
import { isOfflineMode } from '@/lib/offline/requestInterceptor';
import { getOfflineGuests, bulkSaveSnapshot } from '@/lib/offline/electronOfflineBridge';

interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  id_number: string;
  created_at: string;
  status?: string;
  tags?: string[];
  last_stay_date?: string;
  total_bookings?: number;
  total_spent?: number;
}

export default function Guests() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    id_number: '',
  });

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Phase 16: Offline read path - load from IndexedDB when offline
      if (isOfflineMode()) {
        console.log('[Guests] Phase 16: Loading from offline cache...');
        const offlineData = await getOfflineGuests(tenantId);
        console.log('[Guests] Offline: Loaded', offlineData.length, 'guests from IndexedDB');
        return offlineData as Guest[];
      }
      
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Phase 16: Seed to IndexedDB when online in Electron
      if (isElectronContext() && data && data.length > 0) {
        bulkSaveSnapshot(tenantId, 'guests', data).catch(e =>
          console.warn('[Guests] Phase 16: Failed to seed:', e)
        );
      }
      
      return data as Guest[];
    },
    enabled: !!tenantId,
  });

  const filteredGuests = useGuestSearch(guests, searchQuery, { status: statusFilter });

  const createMutation = useMutation({
    mutationFn: async (newGuest: typeof formData) => {
      const { error } = await supabase
        .from('guests')
        .insert({ ...newGuest, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', tenantId] });
      toast({ title: 'Guest added successfully' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Failed to add guest', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof formData }) => {
      const { error } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', tenantId] });
      toast({ title: 'Guest updated successfully' });
      setEditingGuest(null);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Failed to update guest', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', tenantId] });
      toast({ title: 'Guest deleted successfully' });
      setDeletingGuest(null);
    },
    onError: () => {
      toast({ title: 'Failed to delete guest', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      id_number: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGuest) {
      updateMutation.mutate({ id: editingGuest.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone || '',
      id_number: guest.id_number || '',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'blacklisted': return 'destructive';
      default: return 'default';
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading guests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display text-charcoal mb-2">Guests</h1>
          <p className="text-muted-foreground">View and manage guest information</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Guest</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="id_number">ID Number</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Add Guest</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Stays</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.map((guest) => (
              <TableRow 
                key={guest.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/dashboard/guests/${guest.id}`)}
              >
                <TableCell className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {guest.name}
                </TableCell>
                <TableCell>{guest.email || '-'}</TableCell>
                <TableCell>{guest.phone || '-'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(guest.status)}>
                    {guest.status || 'active'}
                  </Badge>
                </TableCell>
                <TableCell>{guest.total_bookings || 0}</TableCell>
                <TableCell>₦{(guest.total_spent || 0).toLocaleString()}</TableCell>
                <TableCell>{new Date(guest.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/guests/${guest.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(guest);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingGuest(guest);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredGuests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery || statusFilter !== 'all' 
              ? 'No guests match your filters.'
              : 'No guests found. Add your first guest to get started.'}
          </div>
        )}
      </Card>

      <Dialog open={!!editingGuest} onOpenChange={() => setEditingGuest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-id-number">ID Number</Label>
              <Input
                id="edit-id-number"
                value={formData.id_number}
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">Update Guest</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingGuest} onOpenChange={() => setDeletingGuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingGuest?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGuest && deleteMutation.mutate(deletingGuest.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
