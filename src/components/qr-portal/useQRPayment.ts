import { useState } from 'react';

export function useQRPayment() {
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<'pay_now' | 'bill_to_room'>('bill_to_room');

  const getPaymentMetadata = () => ({
    guest_contact: guestPhone,
    payment_choice: paymentChoice,
  });

  return {
    guestPhone,
    setGuestPhone,
    paymentChoice,
    setPaymentChoice,
    getPaymentMetadata,
  };
}
