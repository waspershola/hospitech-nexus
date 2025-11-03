import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { Plus, Trash2, FileText } from 'lucide-react';

export function PurchaseOrdersTab() {
  const { orders, createOrder } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { items } = useInventoryItems();
  const [modalOpen, setModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    delivery_date: '',
    notes: '',
    items: [{ item_id: '', quantity: 0, unit_price: 0 }],
  });

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', quantity: 0, unit_price: 0 }],
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

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.075; // 7.5% VAT
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { subtotal, tax, total } = calculateTotals();
    
    // Generate PO number
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const poNumber = `PO-${year}-${random}`;
    
    await createOrder.mutateAsync({
      po_number: poNumber,
      ...formData,
      subtotal,
      tax_amount: tax,
      total_amount: total,
      status: 'draft',
    });
    
    setModalOpen(false);
    setFormData({
      supplier_id: '',
      delivery_date: '',
      notes: '',
      items: [{ item_id: '', quantity: 0, unit_price: 0 }],
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'secondary',
      submitted: 'default',
      approved: 'default',
      received: 'default',
      cancelled: 'destructive',
    };
    return colors[status] || 'secondary';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>Manage inventory purchase orders</CardDescription>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create PO
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.po_number}</TableCell>
                  <TableCell>{order.suppliers?.name}</TableCell>
                  <TableCell>{order.items.length} items</TableCell>
                  <TableCell>₦{order.total_amount?.toLocaleString()}</TableCell>
                  <TableCell>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.status) as any}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.creator?.full_name}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {!orders?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No purchase orders found. Create your first PO to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new purchase order for inventory items
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.filter(s => s.active).map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_date">Expected Delivery Date</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Item</Label>
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
                  <div className="w-24">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="w-32">
                    <Label className="text-xs">Total</Label>
                    <Input
                      value={`₦${(item.quantity * item.unit_price).toLocaleString()}`}
                      disabled
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

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₦{calculateTotals().subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (7.5%):</span>
                <span>₦{calculateTotals().tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>₦{calculateTotals().total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or instructions..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createOrder.isPending}>
                Create Purchase Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
