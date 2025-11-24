import { FrontDeskAddChargeModal } from '@/modules/finance/add-charge/FrontDeskAddChargeModal';
import { toast } from 'sonner';

/**
 * QR Request wrapper for unified Add Charge modal
 * Version: UNIFIED-ADD-CHARGE-V1
 */
interface AddChargeToFolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  onSuccess: () => void;
  billingReferenceCode?: string;
}

export function AddChargeToFolioDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
  billingReferenceCode,
}: AddChargeToFolioDialogProps) {
  // Extract folio ID from request metadata
  const folioId = request?.metadata?.folio_id || request?.stay_folio_id;
  
  if (!folioId) {
    if (open) {
      toast.error('No folio associated with this request');
      onOpenChange(false);
    }
    return null;
  }

  // Extract amount correctly from nested metadata
  const amount = request.metadata?.payment_info?.total_amount || 
                 request.metadata?.payment_info?.subtotal || 0;
  
  const description = `${request.type} service - QR Request`;
  
  return (
    <FrontDeskAddChargeModal
      isOpen={open}
      onClose={() => {
        onOpenChange(false);
        onSuccess();
      }}
      folioId={folioId}
      defaultDescription={description}
      billingReference={billingReferenceCode}
      requestId={request.id}
      origin="frontdesk_drawer"
    />
  );
}
