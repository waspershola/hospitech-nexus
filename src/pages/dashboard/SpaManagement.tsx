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
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit, Trash2, Sparkles, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SpaService {
  id: string;
  service_name: string;
  category: string;
  description: string | null;
  duration: string | null;
  price: number;
  currency: string;
  is_available: boolean;
  display_order: number;
  status: string;
}

export default function SpaManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.user_metadata?.tenantId;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<SpaService | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [formData, setFormData] = useState({
    service_name: '',
    category: 'massage',
    description: '',
    duration: '60 mins',
    price: '',
    currency: 'NGN',
    is_available: true,
    display_order: '0',
    status: 'approved',
  });

  const { data: spaServices = [], isLoading } = useQuery({
    queryKey: ['spa-services', tenantId, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('spa_services')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category')
        .order('display_order');

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SpaService[];
    },
    enabled: !!tenantId,
  });

  const createService = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('spa_services').insert({
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
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast.success('Spa service created successfully');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create service'),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('spa_services')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast.success('Service updated successfully');
      resetForm();
      setIsDialogOpen(false);
      setEditingService(null);
    },
    onError: () => toast.error('Failed to update service'),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('spa_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spa-services'] });
      toast.success('Service deleted successfully');
    },
    onError: () => toast.error('Failed to delete service'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateService.mutate({
        id: editingService.id,
        updates: {
          ...formData,
          price: parseFloat(formData.price),
          display_order: parseInt(formData.display_order),
        },
      });
    } else {
      createService.mutate();
    }
  };

  const handleEdit = (service: SpaService) => {
    setEditingService(service);
    setFormData({
      service_name: service.service_name,
      category: service.category,
      description: service.description || '',
      duration: service.duration || '',
      price: service.price.toString(),
      currency: service.currency,
      is_available: service.is_available,
      display_order: service.display_order.toString(),
      status: service.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      service_name: '',
      category: 'massage',
      description: '',
      duration: '60 mins',
      price: '',
      currency: 'NGN',
      is_available: true,
      display_order: '0',
      status: 'approved',
    });
    setEditingService(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Spa Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage spa services, treatments, and pricing
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Spa Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit' : 'Add'} Spa Service</DialogTitle>
              <DialogDescription>
                {editingService ? 'Update spa service details' : 'Create a new spa treatment service'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service_name">Service Name *</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    placeholder="e.g., Swedish Massage"
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
                      <SelectItem value="massage">Massage</SelectItem>
                      <SelectItem value="facial">Facial</SelectItem>
                      <SelectItem value="body_treatment">Body Treatment</SelectItem>
                      <SelectItem value="manicure_pedicure">Manicure & Pedicure</SelectItem>
                      <SelectItem value="aromatherapy">Aromatherapy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the service, benefits, and experience..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30 mins">30 Minutes</SelectItem>
                      <SelectItem value="60 mins">60 Minutes</SelectItem>
                      <SelectItem value="90 mins">90 Minutes</SelectItem>
                      <SelectItem value="120 mins">120 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label htmlFor="is_available">Available for booking</Label>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                  {(createService.isPending || updateService.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingService ? 'Update' : 'Create'}
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
              <SelectItem value="massage">Massage</SelectItem>
              <SelectItem value="facial">Facial</SelectItem>
              <SelectItem value="body_treatment">Body Treatment</SelectItem>
              <SelectItem value="manicure_pedicure">Manicure & Pedicure</SelectItem>
              <SelectItem value="aromatherapy">Aromatherapy</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : spaServices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No spa services found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaServices.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{service.service_name}</CardTitle>
                  {!service.is_available && <Badge variant="secondary">Unavailable</Badge>}
                </div>
                <CardDescription className="capitalize">{service.category.replace('_', ' ')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-accent">
                    {service.currency} {service.price.toFixed(2)}
                  </span>
                  {service.duration && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {service.duration}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Delete this service?')) {
                        deleteService.mutate(service.id);
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
