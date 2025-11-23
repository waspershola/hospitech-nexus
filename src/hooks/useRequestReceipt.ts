// PHASE-3-PRINT-V1: Reuse existing print infrastructure for QR requests
import { usePrintReceipt } from '@/hooks/usePrintReceipt';

export function useRequestReceipt() {
  const { print, isPrinting } = usePrintReceipt();

  const printRequestReceipt = (request: any) => {
    const amount = request.metadata?.payment_info?.total_amount || 
                   request.metadata?.payment_info?.subtotal || 0;
    
    // Use custom receipt data structure for QR requests
    const customReceiptData: any = {
      guest: {
        id: request.guest_id || '',
        name: request.metadata?.guest_name || 'Guest',
        email: '',
        phone: request.metadata?.guest_contact || '',
      },
      room: request.room ? {
        number: request.room.number,
        type: 'Standard',
      } : undefined,
      booking: undefined,
      charges: [
        {
          description: `${request.type.replace(/_/g, ' ')} Service`,
          amount: amount,
        }
      ],
      payments: request.metadata?.payment_collected ? [
        {
          amount: amount,
          method: request.metadata?.payment_method || 'Cash',
          status: 'completed',
        }
      ] : [],
      hotelMeta: undefined,
      financials: undefined,
      organization: undefined,
      staff: undefined,
    };
    
    print({
      receiptData: customReceiptData,
      receiptType: 'payment',
      guestId: request.guest_id,
      settingsId: undefined,
      locationName: request.room?.number ? `Room ${request.room.number}` : undefined,
    });
  };

  return { printRequestReceipt, isPrinting };
}
