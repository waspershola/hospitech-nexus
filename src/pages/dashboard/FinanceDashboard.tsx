import { useWidgets } from '@/config/widgetRegistry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function FinanceDashboard() {
  const widgets = useWidgets();
  const financeWidgets = widgets.filter(w => w.category === 'finance');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Finance Dashboard</h1>
          <p className="text-muted-foreground">Financial overview and analytics</p>
        </div>
        <DollarSign className="h-8 w-8 text-primary" />
      </div>
      
      <div className="grid gap-6">
        {financeWidgets.map(widget => {
          const Widget = widget.component;
          return (
            <div key={widget.id} className={widget.gridSpan === 'half' ? 'lg:col-span-1' : ''}>
              <Widget />
            </div>
          );
        })}
      </div>
    </div>
  );
}
