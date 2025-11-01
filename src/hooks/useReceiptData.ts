import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchReceiptData } from '@/lib/receiptDataFetcher';

export interface ReceiptData {
  // Booking details
  booking: {
    id: string;
    check_in: string;
    check_out: string;
    total_amount: number;
    status: string;
  } | null;
  
  // Guest details
  guest: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  
  // Room details
  room: {
    number: string;
    type: string;
  } | null;
  
  // Hotel metadata
  hotelMeta: {
    hotel_name: string;
    contact_phone: string | null;
    contact_email: string | null;
  } | null;
  
  // Financials (VAT, service charge)
  financials: {
    vat_rate: number;
    service_charge: number;
    currency: string;
    currency_symbol: string;
  } | null;
  
  // Itemized charges
  charges: Array<{
    id: string;
    charge_type: string;
    description: string;
    amount: number;
    department: string | null;
  }>;
  
  // Payments
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    method_provider: string | null;
    transaction_ref: string | null;
    provider_reference: string | null;
    status: string;
    created_at: string;
  }>;
  
  // Location details
  location: {
    name: string;
  } | null;
  
  // Staff who recorded the transaction
  staff: {
    full_name: string | null;
    email: string | null;
  } | null;
  
  // Organization (if applicable)
  organization: {
    id: string;
    name: string;
  } | null;
  
  // Wallet balance (if applicable)
  walletBalance: number | null;
}

interface UseReceiptDataParams {
  bookingId?: string;
  paymentId?: string;
  guestId?: string;
  organizationId?: string;
}

export function useReceiptData({ bookingId, paymentId, guestId, organizationId }: UseReceiptDataParams) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['receipt-data', tenantId, bookingId, paymentId, guestId],
    queryFn: async (): Promise<ReceiptData> => {
      if (!tenantId) throw new Error('No tenant ID');
      
      return fetchReceiptData({
        tenantId,
        bookingId,
        paymentId,
        guestId,
        organizationId,
      });
    },
    enabled: !!tenantId && (!!bookingId || !!paymentId),
  });
}
