import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBackfillFolios } from '@/hooks/useBackfillFolios';
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
import { Database, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function BackfillFoliosButton() {
  const [showDryRunDialog, setShowDryRunDialog] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const { backfill, isBackfilling, result } = useBackfillFolios();

  const handleDryRun = () => {
    backfill({ dryRun: true });
    setShowDryRunDialog(false);
  };

  const handleExecute = () => {
    backfill({ dryRun: false });
    setShowExecuteDialog(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => setShowDryRunDialog(true)}
          disabled={isBackfilling}
          variant="outline"
        >
          {isBackfilling ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Database className="h-4 w-4 mr-2" />
          )}
          Dry Run Backfill
        </Button>

        {result && !result.dry_run && (
          <Button
            onClick={() => setShowExecuteDialog(true)}
            disabled={isBackfilling || result.results.processed === 0}
            variant="default"
          >
            Execute Backfill
          </Button>
        )}
      </div>

      {result && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">
              {result.dry_run ? 'Dry Run Results' : 'Backfill Results'}
            </h3>
            <div className="space-y-1 text-sm">
              <p>Bookings processed: {result.results.processed}</p>
              {!result.dry_run && (
                <>
                  <p className="text-primary">Folios created: {result.results.created_folios}</p>
                  <p>Charges linked: {result.results.linked_charges}</p>
                  <p>Payments linked: {result.results.linked_payments}</p>
                </>
              )}
              {result.results.errors.length > 0 && (
                <p className="text-destructive">Errors: {result.results.errors.length}</p>
              )}
            </div>

            {result.results.folios.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Details:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {result.results.folios.map((folio: any, idx: number) => (
                    <div key={idx} className="text-xs p-2 bg-muted rounded">
                      <p className="font-medium">{folio.booking_reference} - {folio.guest_name}</p>
                      <p>Room: {folio.room_number}</p>
                      <p>Balance: {folio.balance}</p>
                      <p>
                        {result.dry_run ? 'Would link' : 'Linked'}: {' '}
                        {result.dry_run ? folio.charges_to_link : folio.linked_charges} charges, {' '}
                        {result.dry_run ? folio.payments_to_link : folio.linked_payments} payments
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDryRunDialog} onOpenChange={setShowDryRunDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Dry Run Backfill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will analyze your existing checked-in bookings and show what folios would be created,
              without making any changes to the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDryRun}>Run Dry Run</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute Folio Backfill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create folios for {result?.results.processed || 0} checked-in bookings
              and link all existing charges and payments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute} className="bg-destructive text-destructive-foreground">
              Execute Backfill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
