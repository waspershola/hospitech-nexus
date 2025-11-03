import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStockMovements } from '@/hooks/useStockMovements';
import { useState } from 'react';

export function StockMovementsTab() {
  const { movements } = useStockMovements();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const filteredMovements = movements?.filter(movement => {
    if (filterType !== 'all' && movement.movement_type !== filterType) return false;
    if (filterDepartment !== 'all' && movement.destination !== filterDepartment) return false;
    return true;
  });

  const getMovementColor = (type: string) => {
    const colors: Record<string, string> = {
      purchase: 'default',
      issue: 'secondary',
      return: 'default',
      transfer: 'outline',
      adjustment: 'secondary',
      wastage: 'destructive',
      consumption: 'secondary',
      expired: 'destructive',
    };
    return colors[type] || 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stock Movements</CardTitle>
            <CardDescription>Complete history of all stock transactions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="wastage">Wastage</SelectItem>
                <SelectItem value="consumption">Consumption</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="front_desk">Front Desk</SelectItem>
                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements?.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  {new Date(movement.created_at).toLocaleDateString()} {new Date(movement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{movement.inventory_items?.item_name}</p>
                    <p className="text-xs text-muted-foreground">{movement.inventory_items?.item_code}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getMovementColor(movement.movement_type) as any}>
                    {movement.movement_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {movement.quantity} {movement.inventory_items?.unit}
                </TableCell>
                <TableCell>{movement.source || '-'}</TableCell>
                <TableCell className="capitalize">{movement.destination?.replace('_', ' ') || '-'}</TableCell>
                <TableCell>{movement.reference_no || '-'}</TableCell>
                <TableCell>
                  {movement.total_value ? `₦${movement.total_value.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ))}
            {!filteredMovements?.length && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No movements found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
