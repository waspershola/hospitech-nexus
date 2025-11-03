import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useStockMovements } from '@/hooks/useStockMovements';
import { useInventoryItems } from '@/hooks/useInventoryItems';

interface StockMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementModal({ open, onOpenChange }: StockMovementModalProps) {
  const { performStockOperation } = useStockMovements();
  const { items } = useInventoryItems();
  
  const [formData, setFormData] = useState({
    operation: 'receive' as 'receive' | 'issue' | 'return' | 'adjust' | 'wastage' | 'consumption' | 'transfer',
    item_id: '',
    quantity: 0,
    source: '',
    destination: '',
    department: '',
    reference_no: '',
    unit_cost: 0,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await performStockOperation.mutateAsync(formData);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      operation: 'receive',
      item_id: '',
      quantity: 0,
      source: '',
      destination: '',
      department: '',
      reference_no: '',
      unit_cost: 0,
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Stock Movement</DialogTitle>
          <DialogDescription>
            Record stock receipt, issue, transfer, or adjustment
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="operation">Operation Type</Label>
            <Select value={formData.operation} onValueChange={(value: any) => setFormData({ ...formData, operation: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receive">Receive (Purchase/Delivery)</SelectItem>
                <SelectItem value="issue">Issue to Department</SelectItem>
                <SelectItem value="return">Return from Department</SelectItem>
                <SelectItem value="transfer">Transfer Between Stores</SelectItem>
                <SelectItem value="adjust">Adjustment (Count/Correction)</SelectItem>
                <SelectItem value="wastage">Wastage/Spoilage</SelectItem>
                <SelectItem value="consumption">Consumption</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item_id">Item</Label>
            <Select value={formData.item_id} onValueChange={(value) => setFormData({ ...formData, item_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_code} - {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                required
              />
            </div>

            {formData.operation === 'receive' && (
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                />
              </div>
            )}
          </div>

          {(formData.operation === 'issue' || formData.operation === 'return' || formData.operation === 'consumption') && (
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
          )}

          {formData.operation === 'transfer' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">From</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Source location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">To</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="Destination location"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reference_no">Reference Number</Label>
            <Input
              id="reference_no"
              value={formData.reference_no}
              onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
              placeholder="PO#, Invoice#, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={performStockOperation.isPending}>
              Record Movement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
