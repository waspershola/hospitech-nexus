import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sparkles, X, Wrench } from 'lucide-react';
import { useRoomActions } from '../hooks/useRoomActions';
import { toast } from 'sonner';

interface BulkRoomActionsProps {
  selectedRoomIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
}

export function BulkRoomActions({ selectedRoomIds, onClearSelection, onComplete }: BulkRoomActionsProps) {
  const [confirmAction, setConfirmAction] = useState<'clean' | 'maintenance' | null>(null);
  const { markClean, markMaintenance } = useRoomActions();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: 'clean' | 'maintenance') => {
    setIsProcessing(true);
    try {
      const actionFn = action === 'clean' ? markClean : markMaintenance;
      
      // Process all rooms sequentially
      for (const roomId of selectedRoomIds) {
        await actionFn(roomId);
      }
      
      toast.success(`${selectedRoomIds.length} room${selectedRoomIds.length > 1 ? 's' : ''} marked as ${action === 'clean' ? 'clean' : 'out of service'}`);
      onComplete();
      onClearSelection();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to complete bulk action');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  if (selectedRoomIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-primary text-primary-foreground shadow-luxury rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {selectedRoomIds.length} selected
          </Badge>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmAction('clean')}
              disabled={isProcessing}
              className="rounded-xl"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Mark All Clean
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmAction('maintenance')}
              disabled={isProcessing}
              className="rounded-xl"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Mark Out of Service
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
            className="rounded-xl hover:bg-primary-foreground/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'clean' 
                ? `Mark ${selectedRoomIds.length} room${selectedRoomIds.length > 1 ? 's' : ''} as clean?`
                : `Mark ${selectedRoomIds.length} room${selectedRoomIds.length > 1 ? 's' : ''} as out of service?`
              }
              <br />
              This action will update the status of all selected rooms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleBulkAction(confirmAction)}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
