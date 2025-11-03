import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingDown, DollarSign, Plus, ArrowRightLeft } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { PERMISSIONS } from '@/lib/roles';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Inventory() {
  const { tenantId } = useAuth();
  const { can } = useRole();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch inventory summary
  const { data: items } = useQuery({
    queryKey: ['inventory-items', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, store_stock(*)')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && can(PERMISSIONS.VIEW_INVENTORY),
  });

  // Fetch low stock items
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_low_stock_items', {
        p_tenant_id: tenantId,
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && can(PERMISSIONS.VIEW_INVENTORY),
  });

  // Fetch recent movements
  const { data: recentMovements } = useQuery({
    queryKey: ['recent-movements', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          inventory_items(item_name, item_code),
          staff:created_by(full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && can(PERMISSIONS.VIEW_INVENTORY),
  });

  // Calculate summary stats
  const totalItems = items?.length || 0;
  const totalValue = items?.reduce((sum, item) => {
    const qty = item.store_stock?.[0]?.quantity || 0;
    return sum + (qty * item.cost_price);
  }, 0) || 0;
  const lowStockCount = lowStock?.length || 0;
  const criticalStock = lowStock?.filter((item: any) => item.current_qty === 0).length || 0;

  if (!can(PERMISSIONS.VIEW_INVENTORY)) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            You don't have permission to view inventory.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track and manage your stock levels</p>
        </div>
        {can(PERMISSIONS.MANAGE_INVENTORY_ITEMS) && (
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Stock Movement
            </Button>
            <Button variant="default">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Items below reorder level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalStock}</div>
            <p className="text-xs text-muted-foreground">
              Items with zero stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {lowStockCount} items with low stock levels. {criticalStock > 0 && `${criticalStock} items are completely out of stock.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
              <CardDescription>Latest inventory transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMovements?.map((movement: any) => (
                  <div key={movement.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex-1">
                      <p className="font-medium">{movement.inventory_items?.item_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {movement.movement_type.toUpperCase()} • {movement.quantity} units
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {movement.source} → {movement.destination}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {!recentMovements?.length && (
                  <p className="text-center text-muted-foreground py-8">
                    No recent movements
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>All items in your inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Item list view coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movements</CardTitle>
              <CardDescription>Complete movement history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Movement history coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Items that need reordering</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStock?.map((item: any) => (
                  <div key={item.item_id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Reorder level: {item.reorder_level}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.current_qty === 0 ? 'destructive' : 'secondary'}>
                        {item.current_qty} in stock
                      </Badge>
                    </div>
                  </div>
                ))}
                {!lowStock?.length && (
                  <p className="text-center text-muted-foreground py-8">
                    All items are well stocked
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}