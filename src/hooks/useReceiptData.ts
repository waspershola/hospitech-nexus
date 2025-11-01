import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

      const result: ReceiptData = {
        booking: null,
        guest: null,
        room: null,
        hotelMeta: null,
        financials: null,
        charges: [],
        payments: [],
        location: null,
        staff: null,
        organization: null,
        walletBalance: null,
      };

      // Fetch hotel metadata
      const { data: metaData } = await supabase
        .from('hotel_meta')
        .select('hotel_name, contact_phone, contact_email')
        .eq('tenant_id', tenantId)
        .single();
      
      result.hotelMeta = metaData;

      // Fetch hotel financials
      const { data: financialsData } = await supabase
        .from('hotel_financials')
        .select('vat_rate, service_charge, currency, currency_symbol')
        .eq('tenant_id', tenantId)
        .single();
      
      result.financials = financialsData || {
        vat_rate: 7.5,
        service_charge: 10,
        currency: 'NGN',
        currency_symbol: '₦',
      };

      // If we have a booking ID, fetch booking details
      if (bookingId) {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select(`
            id,
            check_in,
            check_out,
            total_amount,
            status,
            guest_id,
            room_id,
            organization_id,
            rooms (number, type),
            guests (id, name, email, phone),
            organizations (id, name)
          `)
          .eq('id', bookingId)
          .single();

        if (bookingData) {
          result.booking = {
            id: bookingData.id,
            check_in: bookingData.check_in,
            check_out: bookingData.check_out,
            total_amount: bookingData.total_amount,
            status: bookingData.status,
          };

          if (bookingData.rooms) {
            result.room = Array.isArray(bookingData.rooms) 
              ? bookingData.rooms[0] 
              : bookingData.rooms;
          }

          if (bookingData.guests) {
            const guestData = Array.isArray(bookingData.guests) 
              ? bookingData.guests[0] 
              : bookingData.guests;
            result.guest = guestData;
          }

          if (bookingData.organizations) {
            const orgData = Array.isArray(bookingData.organizations)
              ? bookingData.organizations[0]
              : bookingData.organizations;
            result.organization = orgData;
          }

          // Fetch charges for this booking
          const { data: chargesData } = await supabase
            .from('booking_charges')
            .select('id, charge_type, description, amount, department')
            .eq('booking_id', bookingId);

          result.charges = chargesData || [];

          // Fetch payments for this booking
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('id, amount, method, method_provider, transaction_ref, provider_reference, status, created_at, recorded_by')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: false });

          result.payments = paymentsData || [];

          // Get staff info from first payment
          if (paymentsData && paymentsData.length > 0 && paymentsData[0].recorded_by) {
            const { data: staffData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', paymentsData[0].recorded_by)
              .single();

            result.staff = staffData;
          }
        }
      }

      // If we have a payment ID, fetch payment details
      if (paymentId) {
        const { data: paymentData } = await supabase
          .from('payments')
          .select(`
            id,
            amount,
            method,
            method_provider,
            transaction_ref,
            provider_reference,
            status,
            created_at,
            booking_id,
            guest_id,
            organization_id,
            recorded_by
          `)
          .eq('id', paymentId)
          .single();

        if (paymentData) {
          result.payments = [paymentData];

          // If payment has booking_id, fetch booking details
          if (paymentData.booking_id && !bookingId) {
            const { data: bookingData } = await supabase
              .from('bookings')
              .select(`
                id,
                check_in,
                check_out,
                total_amount,
                status,
                rooms (number, type),
                guests (id, name, email, phone)
              `)
              .eq('id', paymentData.booking_id)
              .single();

            if (bookingData) {
              result.booking = {
                id: bookingData.id,
                check_in: bookingData.check_in,
                check_out: bookingData.check_out,
                total_amount: bookingData.total_amount,
                status: bookingData.status,
              };

              if (bookingData.rooms) {
                result.room = Array.isArray(bookingData.rooms)
                  ? bookingData.rooms[0]
                  : bookingData.rooms;
              }

              if (bookingData.guests) {
                const guestData = Array.isArray(bookingData.guests)
                  ? bookingData.guests[0]
                  : bookingData.guests;
                result.guest = guestData;
              }
            }
          }

          // Get staff info
          if (paymentData.recorded_by) {
            const { data: staffData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', paymentData.recorded_by)
              .single();

            result.staff = staffData;
          }

          // Get guest if not from booking
          if (!result.guest && paymentData.guest_id) {
            const { data: guestData } = await supabase
              .from('guests')
              .select('id, name, email, phone')
              .eq('id', paymentData.guest_id)
              .single();

            result.guest = guestData;
          }

          // Get organization
          if (paymentData.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('id, name')
              .eq('id', paymentData.organization_id)
              .single();

            result.organization = orgData;
          }
        }
      }

      // Fetch guest wallet balance if applicable
      if (result.guest?.id || guestId) {
        const guestIdToUse = result.guest?.id || guestId;
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('owner_id', guestIdToUse)
          .eq('wallet_type', 'guest')
          .single();

        if (walletData) {
          result.walletBalance = walletData.balance;
        }
      }

      // Fetch organization wallet balance if applicable
      if (organizationId) {
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('owner_id', organizationId)
          .eq('wallet_type', 'organization')
          .single();

        if (walletData) {
          result.walletBalance = walletData.balance;
        }
      }

      return result;
    },
    enabled: !!tenantId && (!!bookingId || !!paymentId),
  });
}
