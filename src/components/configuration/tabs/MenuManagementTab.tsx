import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMenuManagement, MenuItemData } from '@/hooks/useMenuManagement';
import { ConfigCard } from '../shared/ConfigCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed, Plus, Pencil, Trash2, Image as ImageIcon, Upload, Loader2, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORIES = ['breakfast', 'appetizers', 'main_course', 'desserts', 'beverages', 'sides'];
const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'spicy', 'halal', 'kosher'];

export function MenuManagementTab() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { createMenuItem, updateMenuItem, deleteMenuItem, uploadImage, approveMenuItem, rejectMenuItem, isLoading: isSaving } = useMenuManagement();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<MenuItemData>({
    name: '',
    description: '',
    price: 0,
    currency: 'NGN',
    category: 'main_course',
    image_url: '',
    is_available: true,
    preparation_time: '',
    dietary_tags: [],
    display_order: 0,
  });

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-items', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as MenuItemData[];
    },
    enabled: !!tenantId,
  });

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const handleSubmit = async () => {
    if (editingItem?.id) {
      await updateMenuItem(editingItem.id, formData);
    } else {
      await createMenuItem(formData);
    }
    queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    handleCloseDialog();
  };

  const handleEdit = (item: MenuItemData) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      await deleteMenuItem(id);
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setImagePreview('');
    setFormData({
      name: '',
      description: '',
      price: 0,
      currency: 'NGN',
      category: 'main_course',
      image_url: '',
      is_available: true,
      preparation_time: '',
      dietary_tags: [],
      display_order: 0,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const publicUrl = await uploadImage(file);
    setIsUploading(false);

    if (publicUrl) {
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      setImagePreview(publicUrl);
    }
  };

  const toggleDietaryTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags?.includes(tag)
        ? prev.dietary_tags.filter(t => t !== tag)
        : [...(prev.dietary_tags || []), tag],
    }));
  };

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Menu Items"
        description="Manage your digital menu items"
        icon={UtensilsCrossed}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleCloseDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Menu Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem ? 'Update menu item details and availability' : 'Create a new menu item for your digital menu'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Jollof Rice"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="capitalize">
                              {cat.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Delicious traditional Nigerian rice dish..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prep_time">Prep Time</Label>
                      <Input
                        id="prep_time"
                        value={formData.preparation_time || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, preparation_time: e.target.value }))}
                        placeholder="15-20 mins"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Menu Item Image *</Label>
                    {(imagePreview || formData.image_url) && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                        <img
                          src={imagePreview || formData.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image_url_manual">Or paste image URL</Label>
                      <Input
                        id="image_url_manual"
                        value={formData.image_url}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, image_url: e.target.value }));
                          setImagePreview(e.target.value);
                        }}
                        placeholder="https://..."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload an image (max 10MB) or paste a URL. Images are automatically optimized to WebP format.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Dietary Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY_TAGS.map(tag => (
                        <Badge
                          key={tag}
                          variant={formData.dietary_tags?.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer capitalize"
                          onClick={() => toggleDietaryTag(tag)}
                        >
                          {tag.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="available">Available for Order</Label>
                    <Switch
                      id="available"
                      checked={formData.is_available}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={isSaving || !formData.name || !formData.image_url}>
                    {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No menu items yet. Add your first item!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-muted">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {!item.is_available && (
                      <Badge className="absolute top-2 right-2" variant="destructive">
                        Unavailable
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.category.replace('_', ' ')}
                        </p>
                      </div>
                      <span className="font-bold text-accent">
                        {item.currency} {item.price}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                    {item.dietary_tags && item.dietary_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.dietary_tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 pt-2">
                      {item.status === 'pending_approval' && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              if (item.id) {
                                await approveMenuItem(item.id);
                                queryClient.invalidateQueries({ queryKey: ['menu-items'] });
                              }
                            }}
                            className="flex-1"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (item.id) {
                                await rejectMenuItem(item.id);
                                queryClient.invalidateQueries({ queryKey: ['menu-items'] });
                              }
                            }}
                            className="flex-1"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="flex-1"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => item.id && handleDelete(item.id)}
                          className="flex-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
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
      </ConfigCard>
    </div>
  );
}
