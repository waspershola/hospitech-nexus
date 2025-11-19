import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReopenFolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folioId: string;
  folioNumber: string;
}

export function ReopenFolioDialog({
  open,
  onOpenChange,
  folioId,
  folioNumber,
}: ReopenFolioDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleReopen = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for reopening this folio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update folio status to 'open'
      const { error } = await supabase
        .from("stay_folios")
        .update({
          status: "open",
          metadata: {
            reopened_at: new Date().toISOString(),
            reopen_reason: reason,
          },
        })
        .eq("id", folioId);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["folio", folioId] });
      queryClient.invalidateQueries({ queryKey: ["closed-folios"] });

      toast({
        title: "Folio Reopened",
        description: `Folio #${folioNumber} has been reopened successfully`,
      });

      onOpenChange(false);
      setReason("");
    } catch (error) {
      console.error("Error reopening folio:", error);
      toast({
        title: "Error",
        description: "Failed to reopen folio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen Folio #{folioNumber}</DialogTitle>
          <DialogDescription>
            Reopening this folio will allow you to make changes and add transactions.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This action will change the folio status from closed to open. Please provide
            a reason for audit purposes.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Reopening *</Label>
          <Textarea
            id="reason"
            placeholder="e.g., Guest dispute, accounting correction, missed charge..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleReopen} disabled={isLoading}>
            {isLoading ? "Reopening..." : "Reopen Folio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
