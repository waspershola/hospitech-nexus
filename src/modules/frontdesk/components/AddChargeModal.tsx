import { FrontDeskAddChargeModal } from '@/modules/finance/add-charge/FrontDeskAddChargeModal';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { toast } from 'sonner';

/**
 * Room Action Drawer wrapper for unified Add Charge modal
 * Version: UNIFIED-ADD-CHARGE-V1
 * 
 * NOTE: Changed from payment system to folio system for consistency
 */

interface AddChargeModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  roomNumber: string;
  organizationId?: string;
}

export function AddChargeModal({
  open,
  onClose,
  bookingId,
  roomNumber,
  organizationId,
}: AddChargeModalProps) {
  // Fetch folio for this booking
  const { data: folioBalance } = useBookingFolio(bookingId);
  
  // Get folio ID from booking
  const folioId = folioBalance?.folioId;
  
  if (!folioId) {
    // If no folio exists yet, show error
    if (open) {
      toast.error('No folio found for this booking. Please check in the guest first.');
      onClose();
    }
    return null;
  }

  return (
    <FrontDeskAddChargeModal
      isOpen={open}
      onClose={onClose}
      folioId={folioId}
      defaultDescription={`Charge for Room ${roomNumber}`}
      origin="room_drawer"
    />
  );
}
