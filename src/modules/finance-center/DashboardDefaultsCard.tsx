import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardDefaults } from '@/hooks/useDashboardDefaults';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { MapPin } from 'lucide-react';

const DASHBOARDS = [
  { name: 'front_desk', label: 'Front Desk' },
  { name: 'restaurant', label: 'Restaurant' },
  { name: 'bar', label: 'Bar' },
  { name: 'spa', label: 'Spa' },
];

export function DashboardDefaultsCard() {
  const { defaults, setDefault, getDefaultLocation } = useDashboardDefaults();
  const { locations } = useFinanceLocations();

  const activeLocations = locations.filter(l => l.status === 'active');

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Dashboard Payment Defaults</h3>
            <p className="text-sm text-muted-foreground">
              Set default payment locations for each dashboard to save time
            </p>
          </div>
        </div>

        <div className="grid gap-4 mt-4">
          {DASHBOARDS.map((dashboard) => (
            <div key={dashboard.name} className="grid grid-cols-2 gap-3 items-center">
              <Label htmlFor={`default-${dashboard.name}`} className="text-sm font-medium">
                {dashboard.label}
              </Label>
              <Select
                value={getDefaultLocation(dashboard.name) || 'none'}
                onValueChange={(value) => 
                  setDefault({
                    dashboard_name: dashboard.name,
                    default_location_id: value === 'none' ? null : value,
                  })
                }
              >
                <SelectTrigger id={`default-${dashboard.name}`}>
                  <SelectValue placeholder="No default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default (manual selection)</SelectItem>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                      {location.department && ` (${location.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3 mt-4">
          <p className="text-xs text-muted-foreground">
            💡 When staff open a payment form from a specific dashboard, the default location
            will be automatically selected, reducing manual clicks and errors.
          </p>
        </div>
      </div>
    </Card>
  );
}
