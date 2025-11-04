import { useWidgets } from '@/config/widgetRegistry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wine } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';

export default function BarDashboard() {
  const { role, staffInfo } = useRole();
  const widgets = useWidgets();
  const barWidgets = widgets.filter(w => w.category === 'restaurant');
  
  // Supervisors can only access their own department
  if (role === 'supervisor' && staffInfo?.department !== 'food_beverage') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Bar Dashboard</h1>
          <p className="text-muted-foreground">Manage bar orders and inventory</p>
        </div>
        <Wine className="h-8 w-8 text-primary" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
            <CardDescription>Orders being prepared</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Today's Sales</CardTitle>
            <CardDescription>Bar revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₦0</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Guest Charges</CardTitle>
            <CardDescription>Room charges today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>
      
      {barWidgets.length > 0 && (
        <div className="grid gap-6">
          {barWidgets.map(widget => {
            const Widget = widget.component;
            return <Widget key={widget.id} />;
          })}
        </div>
      )}
    </div>
  );
}
