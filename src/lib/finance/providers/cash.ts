import { PaymentProvider, PaymentPayload, PaymentResponse } from './types';

export const CashProvider: PaymentProvider = {
  id: 'cash',
  name: 'Cash Payment',
  type: 'cash',

  async charge(payload: PaymentPayload): Promise<PaymentResponse> {
    // Cash is instant
    return {
      success: true,
      reference: payload.transaction_ref,
      status: 'success',
      message: 'Cash payment received',
    };
  },
};
