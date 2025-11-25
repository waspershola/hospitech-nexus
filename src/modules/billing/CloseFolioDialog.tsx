import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CloseFolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folioId: string;
  currentStatus: string;
  folioBalance: number;
}

export function CloseFolioDialog({ 
  open, 
  onOpenChange, 
  folioId, 
  currentStatus,
  folioBalance 
}: CloseFolioDialogProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const updateFolioStatusMutation = useMutation({
    mutationFn: async (newStatus: 'open' | 'closed') => {
      if (!tenantId) throw new Error('No tenant ID');

      const { error } = await supabase
        .from('stay_folios')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', folioId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      return newStatus;
    },
    onSuccess: (newStatus) => {
      // QUERY-KEY-FIX-V1: Use standard folio key format
      queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['closed-folios', tenantId] });
      
      toast.success(
        newStatus === 'closed' 
          ? 'Folio closed successfully' 
          : 'Folio reopened successfully'
      );
      
      // Broadcast folio update
      window.postMessage({ 
        type: 'FOLIO_UPDATED', 
        folioId 
      }, '*');
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update folio: ${error.message}`);
    },
  });

  const isClosing = currentStatus === 'open';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isClosing ? 'Close Folio?' : 'Reopen Folio?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isClosing ? (
              <>
                {folioBalance > 0 ? (
                  <span className="text-destructive font-medium">
                    Warning: This folio has an outstanding balance of ₦{folioBalance.toLocaleString()}.
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">
                    Folio balance is settled (₦0.00).
                  </span>
                )}
                <br /><br />
                Closing this folio will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Prevent new charges or payments from being posted</li>
                  <li>Mark the guest's stay as financially complete</li>
                  <li>Move this folio to the Closed Folios archive</li>
                </ul>
                <br />
                You can reopen it later if needed.
              </>
            ) : (
              <>
                Reopening this folio will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Allow new charges and payments to be posted</li>
                  <li>Remove it from the Closed Folios archive</li>
                  <li>Make it active for financial transactions again</li>
                </ul>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateFolioStatusMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => updateFolioStatusMutation.mutate(isClosing ? 'closed' : 'open')}
            disabled={updateFolioStatusMutation.isPending}
          >
            {updateFolioStatusMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isClosing ? 'Close Folio' : 'Reopen Folio'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
