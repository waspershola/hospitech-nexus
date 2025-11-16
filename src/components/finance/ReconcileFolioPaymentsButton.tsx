import { Button } from '@/components/ui/button';
import { useReconcileFolioPayments } from '@/hooks/useReconcileFolioPayments';
import { RefreshCcw, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ReconcileFolioPaymentsButton() {
  const { mutate: reconcile, isPending } = useReconcileFolioPayments();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-2" />
          )}
          Reconcile Payments
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reconcile Folio Payments</AlertDialogTitle>
          <AlertDialogDescription>
            This will find payments that were created but not linked to folios,
            and attempt to link them automatically. This is safe to run and will
            only affect unlinked payments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => reconcile()}>
            Reconcile Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
