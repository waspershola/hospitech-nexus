import { useState } from 'react';
import { ConfigCard } from '../shared/ConfigCard';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Database, RefreshCw, Download, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useConfigStore } from '@/stores/configStore';
import { useAuth } from '@/contexts/AuthContext';

export function MaintenanceTab() {
  const { tenantId } = useAuth();
  const configStore = useConfigStore();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showRecalculateDialog, setShowRecalculateDialog] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setShowRecalculateDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('recalculate-financials', {
        body: { tenant_id: tenantId },
      });

      if (error) throw error;

      toast.success(data.message || 'Financial recalculation completed', {
        description: data.updated_bookings
          ? `Updated ${data.updated_bookings} booking(s)`
          : undefined,
      });
    } catch (error: any) {
      console.error('Recalculation failed:', error);
      toast.error('Failed to recalculate financials', {
        description: error.message || 'Please try again later',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleExportConfig = () => {
    try {
      const state = useConfigStore.getState();
      const exportData = {
        exported_at: new Date().toISOString(),
        tenant_id: state.tenantId,
        version: state.version,
        configurations: state.configurations,
        branding: state.branding,
        emailSettings: state.emailSettings,
        hotelMeta: state.hotelMeta,
        documentTemplates: state.documentTemplates,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotel-config-${state.tenantId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Configuration exported successfully', {
        description: 'JSON file downloaded to your device',
      });
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Failed to export configuration', {
        description: error.message,
      });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <ConfigCard
          title="Database Utilities"
          description="Administrative tools for data management and maintenance"
          icon={Database}
        >
          <div className="space-y-4">
            {/* Recalculate Financials */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">
                  Recalculate Tax & Service Charges
                </h4>
                <p className="text-sm text-muted-foreground">
                  Update all active and future bookings with current VAT and service charge
                  rates. This applies your latest financial settings.
                </p>
              </div>
              <Button
                onClick={() => setShowRecalculateDialog(true)}
                variant="outline"
                disabled={isRecalculating}
                className="ml-4"
              >
                {isRecalculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalculate
                  </>
                )}
              </Button>
            </div>

            {/* Export Configuration */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">Export Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Download all hotel settings as a JSON backup file. This includes branding,
                  financials, email settings, and more.
                </p>
              </div>
              <Button onClick={handleExportConfig} variant="outline" className="ml-4">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </ConfigCard>

        {/* System Information */}
        <ConfigCard title="System Information" description="Current configuration status">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Configuration Version</span>
              <span className="font-medium font-mono text-sm">
                v{configStore.version || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="font-medium text-sm">
                {configStore.lastSyncTime
                  ? new Date(configStore.lastSyncTime).toLocaleString()
                  : 'Never'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Save Counter</span>
              <span className="font-medium text-sm">{configStore.saveCounter || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Tenant ID</span>
              <span className="font-mono text-xs text-muted-foreground">
                {configStore.tenantId || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Unsaved Changes</span>
              <span className="font-medium text-sm">
                {configStore.unsavedChanges.length > 0
                  ? `${configStore.unsavedChanges.length} pending`
                  : 'All saved'}
              </span>
            </div>
          </div>
        </ConfigCard>

        {/* Warning Notice */}
        <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-foreground mb-1">Maintenance Operations</h4>
            <p className="text-sm text-muted-foreground">
              These are administrative tools that can affect multiple records. Always ensure you
              have recent backups before running maintenance operations. Configuration exports do
              not include booking, payment, or guest data.
            </p>
          </div>
        </div>
      </div>

      {/* Recalculate Confirmation Dialog */}
      <AlertDialog open={showRecalculateDialog} onOpenChange={setShowRecalculateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalculate Financial Totals?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will update all active and future bookings with your current VAT and service
                charge rates.
              </p>
              <p className="font-medium text-foreground">This operation will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Apply current financial settings to all future bookings</li>
                <li>Recalculate totals including VAT and service charges</li>
                <li>Update booking metadata with new amounts</li>
              </ul>
              <p className="text-warning mt-2">
                Past completed bookings will not be affected.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecalculate}>
              Proceed with Recalculation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
