import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function RoomLegend() {
  const statuses = [
    { label: 'Available', color: 'bg-green-500', count: 0 },
    { label: 'Occupied', color: 'bg-red-500', count: 0 },
    { label: 'Reserved', color: 'bg-blue-500', count: 0 },
    { label: 'Dirty', color: 'bg-orange-500', count: 0 },
    { label: 'Overstay', color: 'bg-purple-500', count: 0 },
    { label: 'Out of Service', color: 'bg-gray-500', count: 0 },
  ];

  return (
    <Card className="p-4 sticky top-4">
      <h3 className="text-lg font-display font-semibold mb-4">Room Status</h3>
      <div className="space-y-3">
        {statuses.map((status) => (
          <div key={status.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status.color}`} />
              <span className="text-sm text-foreground">{status.label}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
