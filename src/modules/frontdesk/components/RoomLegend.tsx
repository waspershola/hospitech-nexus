import { Card } from '@/components/ui/card';

export function RoomLegend() {
  const statuses = [
    { label: 'Available', color: 'hsl(var(--status-available))' },
    { label: 'Occupied', color: 'hsl(var(--status-occupied))' },
    { label: 'Reserved', color: 'hsl(var(--status-reserved))' },
    { label: 'Cleaning', color: 'hsl(var(--status-dirty))' },
    { label: 'Overstay', color: 'hsl(var(--status-overstay))' },
    { label: 'Maintenance', color: 'hsl(var(--status-oos))' },
  ];

  return (
    <Card className="p-6 sticky top-4 rounded-2xl shadow-[var(--shadow-card)] transition-[var(--transition-smooth)]">
      <h3 className="text-lg font-display font-semibold mb-6 text-foreground">Room Status Legend</h3>
      <div className="space-y-4">
        {statuses.map((status) => (
          <div key={status.label} className="flex items-center gap-3 group">
            <div 
              className="w-4 h-4 rounded-full transition-[var(--transition-smooth)] group-hover:scale-110 shadow-sm" 
              style={{ backgroundColor: status.color }}
            />
            <span className="text-sm font-medium text-foreground">{status.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
