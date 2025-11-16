import { Button } from '@/components/ui/button';
import { useRecoverFolioData } from '@/hooks/useRecoverFolioData';
import { Wrench, Loader2 } from 'lucide-react';
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

export function RecoverFolioDataButton() {
  const { mutate: recover, isPending } = useRecoverFolioData();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wrench className="h-4 w-4 mr-2" />
          )}
          Recover Folio Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recover Folio Data</AlertDialogTitle>
          <AlertDialogDescription>
            This will automatically:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Create missing folios for checked-in bookings</li>
              <li>Post booking charges to folios with zero charges</li>
            </ul>
            <p className="mt-2">
              This is safe to run and will only create/update missing data. Existing correct data will not be affected.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => recover()}>
            Recover Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
