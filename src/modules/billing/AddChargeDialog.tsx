import { FrontDeskAddChargeModal } from '@/modules/finance/add-charge/FrontDeskAddChargeModal';
import { useFolioById } from '@/hooks/useFolioById';

/**
 * Billing Center wrapper for unified Add Charge modal
 * Version: UNIFIED-ADD-CHARGE-V1
 */
interface AddChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folioId: string;
}

export function AddChargeDialog({ open, onOpenChange, folioId }: AddChargeDialogProps) {
  const { data: folio } = useFolioById(folioId);
  
  return (
    <FrontDeskAddChargeModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      folioId={folioId}
      origin="billing_center"
    />
  );
}
