import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddChargeToFolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  onSuccess: () => void;
  billingReferenceCode?: string; // Optional billing reference for QR Billing Tasks
}

export function AddChargeToFolioDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
  billingReferenceCode,
}: AddChargeToFolioDialogProps) {
  const { tenantId } = useAuth();
  const [selectedFolioId, setSelectedFolioId] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);

  // Fetch open folios
  const { data: folios, isLoading } = useQuery({
    queryKey: ['open-folios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('stay_folios')
        .select(`
          id,
          folio_number,
          booking_id,
          guest_id,
          room_id,
          balance,
          bookings (
            booking_reference,
            guest_id,
            room_id
          ),
          guests (
            name,
            phone
          ),
          rooms (
            number
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!tenantId,
  });

  const handleAddCharge = async () => {
    if (!selectedFolioId || !tenantId) {
      toast.error('Please select a folio');
      return;
    }

    const amount = request.metadata?.payment_info?.total_amount || 
                   request.metadata?.payment_info?.subtotal || 0;

    if (amount <= 0) {
      toast.error('Invalid charge amount');
      return;
    }

    setIsPosting(true);
    try {
      // Post charge to folio
      const { data, error } = await supabase.rpc('folio_post_charge', {
        p_folio_id: selectedFolioId,
        p_amount: amount,
        p_description: `${request.type} service - QR Request`,
        p_reference_type: 'qr_request',
        p_reference_id: request.id,
        p_department: request.assigned_department || 'general',
      });

      if (error) throw error;

      // Update request to mark as charged and update billing status if applicable
      const updateData: any = {
        status: 'completed',
        metadata: {
          ...request.metadata,
          folio_id: selectedFolioId,
          charged_at: new Date().toISOString(),
          charge_method: 'staff_selected_folio',
        },
        updated_at: new Date().toISOString(),
      };

      // If this is a QR Billing Task, update billing tracking fields
      if (billingReferenceCode) {
        updateData.billing_status = 'posted_to_folio';
        updateData.billing_processed_by = tenantId;
        updateData.billing_processed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', request.id)
        .eq('tenant_id', tenantId);

      if (updateError) throw updateError;

      toast.success('Charge posted to folio successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[AddChargeToFolioDialog] Error:', error);
      toast.error(error.message || 'Failed to post charge');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Charge to Folio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {billingReferenceCode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">QR Billing Task</span> - Reference: <span className="font-mono text-primary">{billingReferenceCode}</span>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select which guest folio to charge for this {request.type} request.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Amount to Charge</Label>
            <div className="text-2xl font-bold">
              ₦{((request.metadata?.payment_info?.total_amount || 
                  request.metadata?.payment_info?.subtotal || 0) / 100).toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Folio</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading open folios...
              </div>
            ) : folios && folios.length > 0 ? (
              <Select value={selectedFolioId} onValueChange={setSelectedFolioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folio..." />
                </SelectTrigger>
                <SelectContent>
                  {folios.map((folio: any) => (
                    <SelectItem key={folio.id} value={folio.id}>
                      {folio.folio_number} - Room {folio.rooms?.number} - {folio.guests?.name}
                      {' '}(Balance: ₦{((folio.balance || 0) / 100).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  No open folios found. Please check in a guest first.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleAddCharge}
              disabled={!selectedFolioId || isPosting}
              className="flex-1"
            >
              {isPosting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Charge'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPosting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
