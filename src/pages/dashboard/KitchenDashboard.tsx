import { useWidgets } from '@/config/widgetRegistry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed } from 'lucide-react';

export default function KitchenDashboard() {
  const widgets = useWidgets();
  const kitchenWidgets = widgets.filter(w => w.category === 'restaurant');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Kitchen Dashboard</h1>
          <p className="text-muted-foreground">Manage room service and dining orders</p>
        </div>
        <UtensilsCrossed className="h-8 w-8 text-primary" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
            <CardDescription>Orders in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Awaiting preparation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Today's Revenue</CardTitle>
            <CardDescription>Kitchen sales</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₦0</p>
          </CardContent>
        </Card>
      </div>
      
      {kitchenWidgets.length > 0 && (
        <div className="grid gap-6">
          {kitchenWidgets.map(widget => {
            const Widget = widget.component;
            return <Widget key={widget.id} />;
          })}
        </div>
      )}
    </div>
  );
}
