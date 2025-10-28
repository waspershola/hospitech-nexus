import { Card } from '@/components/ui/card';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-charcoal mb-2">Reports</h1>
        <p className="text-muted-foreground">Analytics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-display text-charcoal mb-4">Revenue Overview</h3>
          <div className="text-center py-12 text-muted-foreground">
            Revenue charts coming soon
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-display text-charcoal mb-4">Occupancy Trends</h3>
          <div className="text-center py-12 text-muted-foreground">
            Occupancy trends coming soon
          </div>
        </Card>
      </div>
    </div>
  );
}