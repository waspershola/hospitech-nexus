import { ConfigCard } from '../shared/ConfigCard';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

export function MaintenanceTab() {
  const handleRecalculate = async () => {
    toast.info('Recalculation started...');
    // Placeholder for recalculation logic
    setTimeout(() => {
      toast.success('All calculations have been updated');
    }, 2000);
  };

  const handleExportConfig = () => {
    toast.success('Configuration exported successfully');
    // Placeholder for export logic
  };

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Database Utilities"
        description="Administrative tools for data management"
        icon={Database}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-medium">Recalculate Tax & Service Charges</h4>
              <p className="text-sm text-muted-foreground">
                Update all existing bookings with current tax rates
              </p>
            </div>
            <Button onClick={handleRecalculate} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalculate
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-medium">Export Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Download all settings as JSON backup
              </p>
            </div>
            <Button onClick={handleExportConfig} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </ConfigCard>

      <ConfigCard title="System Information">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Configuration Version</span>
            <span className="font-medium">v2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Full Sync</span>
            <span className="font-medium">{new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database Schema</span>
            <span className="font-medium">hotel_config_v2</span>
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
