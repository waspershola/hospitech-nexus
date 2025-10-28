import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Bed } from 'lucide-react';
import { useRoomCategories } from '@/hooks/useRoomCategories';

type Room = {
  id: string;
  number: string;
  type: string;
  category_id: string | null;
  floor: number | null;
  status: string;
  rate: number | null;
  notes: string | null;
  room_categories?: {
    name: string;
    short_code: string;
  };
};

export default function Rooms() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useRoomCategories();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [bulkMode, setBulkMode] = useState<'single' | 'range' | 'list'>('single');
  const [formData, setFormData] = useState({
    number: '',
    category_id: '',
    floor: '',
    status: 'available',
    rate: '',
    notes: '',
    quantity: '1',
    rangeStart: '',
    rangeEnd: '',
    roomList: ''
  });

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, room_categories(name, short_code)')
        .eq('tenant_id', tenantId)
        .order('number');
      
      if (error) throw error;
      return data as Room[];
    },
    enabled: !!tenantId
  });

  const createMutation = useMutation({
    mutationFn: async (newRoom: typeof formData) => {
      const category = categories.find(c => c.id === newRoom.category_id);
      let roomNumbers: string[] = [];

      // Generate room numbers based on mode
      if (bulkMode === 'single') {
        roomNumbers = [newRoom.number];
      } else if (bulkMode === 'range') {
        const start = parseInt(newRoom.rangeStart);
        const end = parseInt(newRoom.rangeEnd);
        if (isNaN(start) || isNaN(end) || start > end || end - start > 100) {
          throw new Error('Invalid range. Maximum 100 rooms at once.');
        }
        roomNumbers = Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
      } else if (bulkMode === 'list') {
        roomNumbers = newRoom.roomList
          .split(',')
          .map(n => n.trim())
          .filter(n => n.length > 0 && n.length <= 20);
        if (roomNumbers.length === 0 || roomNumbers.length > 100) {
          throw new Error('Invalid list. Please provide 1-100 room numbers.');
        }
      }

      const roomsToCreate = roomNumbers.map(number => ({
        number,
        type: category?.short_code || 'standard',
        category_id: newRoom.category_id || null,
        floor: newRoom.floor ? parseInt(newRoom.floor) : null,
        rate: newRoom.rate ? parseFloat(newRoom.rate) : category?.base_rate || null,
        status: newRoom.status,
        notes: newRoom.notes || null,
        tenant_id: tenantId
      }));

      const { error } = await supabase
        .from('rooms')
        .insert(roomsToCreate);
      
      if (error) throw error;
      return roomNumbers.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: `${count} room${count > 1 ? 's' : ''} created successfully` });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof formData }) => {
      const category = categories.find(c => c.id === updates.category_id);
      const { error } = await supabase
        .from('rooms')
        .update({
          number: updates.number,
          type: category?.short_code || 'standard',
          category_id: updates.category_id || null,
          floor: updates.floor ? parseInt(updates.floor) : null,
          rate: updates.rate ? parseFloat(updates.rate) : null,
          status: updates.status,
          notes: updates.notes || null
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room updated successfully' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setBulkMode('single');
    setFormData({
      number: '',
      category_id: '',
      floor: '',
      status: 'available',
      rate: '',
      notes: '',
      quantity: '1',
      rangeStart: '',
      rangeEnd: '',
      roomList: ''
    });
    setEditingRoom(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setBulkMode('single');
    setFormData({
      number: room.number,
      category_id: room.category_id || '',
      floor: room.floor?.toString() || '',
      status: room.status,
      rate: room.rate?.toString() || '',
      notes: room.notes || '',
      quantity: '1',
      rangeStart: '',
      rangeEnd: '',
      roomList: ''
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'occupied': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'maintenance': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'cleaning': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-charcoal mb-2">Rooms</h1>
          <p className="text-muted-foreground">Manage your hotel rooms and inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingRoom && (
                <div className="space-y-2">
                  <Label>Creation Mode</Label>
                  <Select value={bulkMode} onValueChange={(value: any) => setBulkMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Room</SelectItem>
                      <SelectItem value="range">Range (e.g., 101-110)</SelectItem>
                      <SelectItem value="list">List (comma-separated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {bulkMode === 'single' && (
                <div className="space-y-2">
                  <Label htmlFor="number">Room Number *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="e.g., 101"
                    maxLength={20}
                    required
                  />
                </div>
              )}

              {bulkMode === 'range' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rangeStart">Start Number *</Label>
                    <Input
                      id="rangeStart"
                      type="number"
                      value={formData.rangeStart}
                      onChange={(e) => setFormData({ ...formData, rangeStart: e.target.value })}
                      placeholder="101"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rangeEnd">End Number *</Label>
                    <Input
                      id="rangeEnd"
                      type="number"
                      value={formData.rangeEnd}
                      onChange={(e) => setFormData({ ...formData, rangeEnd: e.target.value })}
                      placeholder="110"
                      required
                    />
                  </div>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Creates rooms 101, 102, 103... up to 110 (max 100 rooms)
                  </p>
                </div>
              )}

              {bulkMode === 'list' && (
                <div className="space-y-2">
                  <Label htmlFor="roomList">Room Numbers *</Label>
                  <Textarea
                    id="roomList"
                    value={formData.roomList}
                    onChange={(e) => setFormData({ ...formData, roomList: e.target.value })}
                    placeholder="101, 102, 105, 201A, 202B"
                    rows={3}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter comma-separated room numbers (max 100)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => {
                    const category = categories.find(c => c.id === value);
                    setFormData({ 
                      ...formData, 
                      category_id: value,
                      rate: category?.base_rate?.toString() || formData.rate
                    });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({cat.short_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate">Rate per Night</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" variant="gold">
                  {editingRoom ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading rooms...</div>
      ) : rooms && rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Bed className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-charcoal">Room {room.number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {room.room_categories?.name || room.type}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(room.status)}>{room.status}</Badge>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                {room.floor && <p className="text-muted-foreground">Floor: {room.floor}</p>}
                {room.rate && <p className="font-medium text-charcoal">${room.rate}/night</p>}
                {room.notes && <p className="text-muted-foreground text-xs">{room.notes}</p>}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(room)} className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => deleteMutation.mutate(room.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bed className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-display text-charcoal mb-2">No rooms yet</h3>
          <p className="text-muted-foreground mb-4">Start by adding your first room</p>
          <Button variant="gold" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Room
          </Button>
        </Card>
      )}
    </div>
  );
}