import { useWidgets } from '@/config/widgetRegistry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';

export default function HousekeepingDashboard() {
  const { role, staffInfo } = useRole();
  const widgets = useWidgets();
  const housekeepingWidgets = widgets.filter(w => w.category === 'housekeeping');
  
  // Supervisors can only access their own department
  if (role === 'supervisor' && staffInfo?.department !== 'housekeeping') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Housekeeping Dashboard</h1>
          <p className="text-muted-foreground">Room cleaning and maintenance status</p>
        </div>
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>My Assigned Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You only see rooms assigned to you or rooms that need cleaning.
          </p>
        </CardContent>
      </Card>
      
      <div className="grid gap-6">
        {housekeepingWidgets.map(widget => {
          const Widget = widget.component;
          return <Widget key={widget.id} />;
        })}
      </div>
    </div>
  );
}
