import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
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
import { useReconcileFolioPayments } from '@/hooks/useReconcileFolioPayments';

export function FolioReconciliationButton() {
  const [showDialog, setShowDialog] = useState(false);
  const reconcile = useReconcileFolioPayments();

  const handleReconcile = () => {
    reconcile.mutate();
    setShowDialog(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        disabled={reconcile.isPending}
      >
        {reconcile.isPending ? (
          <>
            <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
            Reconciling...
          </>
        ) : (
          <>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reconcile Folios
          </>
        )}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Reconcile Folio Payments
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                This will find all payments that were recorded but not properly linked to stay folios,
                and post them to the correct folios.
              </p>
              <div className="bg-muted p-3 rounded-md space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Updates folio balances with missing payments</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Syncs Room Drawer and Finance Center data</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Creates folio transaction records</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This is safe to run and will not modify completed payments.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReconcile}>
              Start Reconciliation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
