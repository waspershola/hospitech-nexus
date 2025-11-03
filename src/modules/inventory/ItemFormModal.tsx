import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useInventoryItems, type InventoryItem } from '@/hooks/useInventoryItems';

interface ItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem;
}

export function ItemFormModal({ open, onOpenChange, item }: ItemFormModalProps) {
  const { createItem, updateItem } = useInventoryItems();
  const [formData, setFormData] = useState({
    item_code: item?.item_code || '',
    item_name: item?.item_name || '',
    category: item?.category || 'food',
    unit: item?.unit || 'kg',
    reorder_level: item?.reorder_level || 0,
    cost_price: item?.cost_price || 0,
    is_perishable: item?.is_perishable || false,
    shelf_life_days: item?.shelf_life_days || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (item) {
      await updateItem.mutateAsync({ id: item.id, data: formData });
    } else {
      await createItem.mutateAsync(formData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update inventory item details' : 'Add a new item to inventory'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_code">Item Code</Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item_name">Item Name</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="linen">Linen</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="kg, liters, pcs, etc."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder Level</Label>
              <Input
                id="reorder_level"
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_perishable">Perishable Item</Label>
                <p className="text-sm text-muted-foreground">Track expiry dates for this item</p>
              </div>
              <Switch
                id="is_perishable"
                checked={formData.is_perishable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_perishable: checked })}
              />
            </div>

            {formData.is_perishable && (
              <div className="space-y-2">
                <Label htmlFor="shelf_life_days">Shelf Life (Days)</Label>
                <Input
                  id="shelf_life_days"
                  type="number"
                  value={formData.shelf_life_days || ''}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: parseInt(e.target.value) })}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
              {item ? 'Update' : 'Add'} Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
