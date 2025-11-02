import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export default function MaintenanceDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Maintenance Dashboard</h1>
          <p className="text-muted-foreground">Room maintenance and repairs</p>
        </div>
        <Wrench className="h-8 w-8 text-primary" />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Rooms Requiring Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You only see rooms marked for maintenance or out of order.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
