import { supabase } from '@/integrations/supabase/client';
import type { ReceiptData } from '@/hooks/useReceiptData';

interface FetchReceiptDataParams {
  tenantId: string;
  bookingId?: string;
  paymentId?: string;
  guestId?: string;
  organizationId?: string;
}

export async function fetchReceiptData({
  tenantId,
  bookingId,
  paymentId,
  guestId,
  organizationId,
}: FetchReceiptDataParams): Promise<ReceiptData> {
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

      // If payment has booking_id, fetch booking details (even if bookingId was already passed)
      if (paymentData.booking_id) {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select(`
            id,
            check_in,
            check_out,
            total_amount,
            status,
            room_id,
            guest_id,
            organization_id
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

          // Fetch room separately
          if (bookingData.room_id) {
            const { data: roomData } = await supabase
              .from('rooms')
              .select('id, number, type')
              .eq('id', bookingData.room_id)
              .single();
            
            if (roomData) {
              result.room = roomData;
            }
          }

          // Fetch guest separately
          if (bookingData.guest_id) {
            const { data: guestData } = await supabase
              .from('guests')
              .select('id, name, email, phone')
              .eq('id', bookingData.guest_id)
              .single();
            
            if (guestData) {
              result.guest = guestData;
            }
          }

          // Fetch organization separately
          if (bookingData.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('id, name, contact_person')
              .eq('id', bookingData.organization_id)
              .single();
            
            if (orgData) {
              result.organization = orgData;
            }
          }

        // Fetch charges for this booking (exclude balance_due accounting entries)
        const { data: chargesData } = await supabase
          .from('booking_charges')
          .select('id, charge_type, description, amount, department')
          .eq('booking_id', paymentData.booking_id)
          .neq('charge_type', 'balance_due');

        result.charges = chargesData || [];

          // Fetch all payments for this booking (not just the current one)
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('id, amount, method, method_provider, transaction_ref, provider_reference, status, created_at, recorded_by')
            .eq('booking_id', paymentData.booking_id)
            .order('created_at', { ascending: false });

          if (paymentsData) {
            result.payments = paymentsData;
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

  // Debug logging
  console.log('Receipt Data Fetched:', {
    booking: result.booking,
    guest: result.guest,
    room: result.room,
    charges: result.charges?.length,
    payments: result.payments?.length,
    organization: result.organization,
  });

  return result;
}
