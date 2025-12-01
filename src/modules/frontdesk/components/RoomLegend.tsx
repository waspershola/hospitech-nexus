import { Card } from '@/components/ui/card';

export function RoomLegend() {
  const statuses = [
    { label: 'Available', color: 'hsl(var(--status-available))' },
    { label: 'Occupied', color: 'hsl(var(--status-occupied))' },
    { label: 'Reserved', color: 'hsl(var(--status-reserved))' },
    { label: 'No-Show', color: 'hsl(var(--status-noshow))' },
    { label: 'Cleaning', color: 'hsl(var(--status-dirty))' },
    { label: 'Overstay', color: 'hsl(var(--status-overstay))' },
    { label: 'Maintenance', color: 'hsl(var(--status-oos))' },
  ];

  return (
    <Card className="p-4 rounded-xl shadow-sm">
      <h3 className="text-sm font-display font-semibold mb-3 text-foreground">Room Status Legend</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statuses.map((status) => (
          <div key={status.label} className="flex items-center gap-2 group">
            <div 
              className="w-3 h-3 rounded-full transition-[var(--transition-smooth)] group-hover:scale-110 shadow-sm flex-shrink-0" 
              style={{ backgroundColor: status.color }}
            />
            <span className="text-xs font-medium text-foreground">{status.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
