import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit, Trash2, ShirtIcon } from 'lucide-react';
import { toast } from 'sonner';

interface LaundryItem {
  id: string;
  item_name: string;
  category: string;
  service_type: string;
  price: number;
  currency: string;
  turnaround_time: string | null;
  is_available: boolean;
  display_order: number;
  status: string;
}

export default function LaundryManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.user_metadata?.tenantId;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LaundryItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [formData, setFormData] = useState({
    item_name: '',
    category: 'clothing',
    service_type: 'wash_iron',
    price: '',
    currency: 'NGN',
    turnaround_time: '24 hours',
    is_available: true,
    display_order: '0',
    status: 'approved',
  });

  const { data: laundryItems = [], isLoading } = useQuery({
    queryKey: ['laundry-items', tenantId, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('laundry_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category')
        .order('display_order');

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LaundryItem[];
    },
    enabled: !!tenantId,
  });

  const createItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('laundry_items').insert({
        tenant_id: tenantId,
        created_by: user?.id,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        ...formData,
        price: parseFloat(formData.price),
        display_order: parseInt(formData.display_order),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laundry-items'] });
      toast.success('Laundry item created successfully');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create item'),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('laundry_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laundry-items'] });
      toast.success('Item updated successfully');
      resetForm();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to update item'),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('laundry_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laundry-items'] });
      toast.success('Item deleted successfully');
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItem.mutate({
        id: editingItem.id,
        updates: {
          ...formData,
          price: parseFloat(formData.price),
          display_order: parseInt(formData.display_order),
        },
      });
    } else {
      createItem.mutate();
    }
  };

  const handleEdit = (item: LaundryItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      service_type: item.service_type,
      price: item.price.toString(),
      currency: item.currency,
      turnaround_time: item.turnaround_time || '',
      is_available: item.is_available,
      display_order: item.display_order.toString(),
      status: item.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category: 'clothing',
      service_type: 'wash_iron',
      price: '',
      currency: 'NGN',
      turnaround_time: '24 hours',
      is_available: true,
      display_order: '0',
      status: 'approved',
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Laundry Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage laundry items, pricing, and service types
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Laundry Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Laundry Item</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update laundry item details' : 'Create a new laundry service item'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Item Name *</Label>
                  <Input
                    id="item_name"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    placeholder="e.g., Shirt, Trousers"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="bedding">Bedding</SelectItem>
                      <SelectItem value="curtains">Curtains</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                    <SelectTrigger id="service_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wash_only">Wash Only</SelectItem>
                      <SelectItem value="wash_iron">Wash & Iron</SelectItem>
                      <SelectItem value="dry_clean">Dry Clean</SelectItem>
                      <SelectItem value="iron_only">Iron Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnaround_time">Turnaround Time</Label>
                  <Select value={formData.turnaround_time} onValueChange={(value) => setFormData({ ...formData, turnaround_time: value })}>
                    <SelectTrigger id="turnaround_time">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24 hours">24 Hours</SelectItem>
                      <SelectItem value="48 hours">48 Hours</SelectItem>
                      <SelectItem value="express">Express (Same Day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label htmlFor="is_available">Available to guests</Label>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                  {(createItem.isPending || updateItem.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="clothing">Clothing</SelectItem>
              <SelectItem value="bedding">Bedding</SelectItem>
              <SelectItem value="curtains">Curtains</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : laundryItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShirtIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No laundry items found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {laundryItems.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{item.item_name}</CardTitle>
                  {!item.is_available && <Badge variant="secondary">Unavailable</Badge>}
                </div>
                <CardDescription className="capitalize">{item.category} • {item.service_type.replace('_', ' ')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-accent">
                    {item.currency} {item.price.toFixed(2)}
                  </span>
                  {item.turnaround_time && (
                    <Badge variant="outline">{item.turnaround_time}</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Delete this item?')) {
                        deleteItem.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
