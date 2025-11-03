import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDepartmentRequests } from '@/hooks/useDepartmentRequests';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { Plus, Trash2 } from 'lucide-react';

interface DepartmentRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentRequestModal({ open, onOpenChange }: DepartmentRequestModalProps) {
  const { processRequest } = useDepartmentRequests();
  const { items } = useInventoryItems();
  
  const [formData, setFormData] = useState({
    department: '',
    purpose: '',
    priority: 'normal' as 'urgent' | 'normal' | 'low',
    items: [{ item_id: '', requested_qty: 0 }],
  });

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', requested_qty: 0 }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await processRequest.mutateAsync({
      action: 'create',
      department: formData.department,
      items: formData.items,
      purpose: formData.purpose,
      priority: formData.priority,
    });
    
    onOpenChange(false);
    
    // Reset form
    setFormData({
      department: '',
      purpose: '',
      priority: 'normal',
      items: [{ item_id: '', requested_qty: 0 }],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Department Request</DialogTitle>
          <DialogDescription>
            Request items from the store for your department
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front_desk">Front Desk</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Reason for request..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Requested Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    value={item.item_id} 
                    onValueChange={(value) => updateItem(index, 'item_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items?.map((inventoryItem) => (
                        <SelectItem key={inventoryItem.id} value={inventoryItem.id}>
                          {inventoryItem.item_code} - {inventoryItem.item_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Qty"
                    value={item.requested_qty}
                    onChange={(e) => updateItem(index, 'requested_qty', parseFloat(e.target.value))}
                  />
                </div>
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processRequest.isPending}>
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
