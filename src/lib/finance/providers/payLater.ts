import { PaymentProvider, PaymentPayload, PaymentResponse } from './types';

export const PayLaterProvider: PaymentProvider = {
  id: 'pay_later',
  name: 'Pay Later',
  type: 'credit_deferred',

  async charge(payload: PaymentPayload): Promise<PaymentResponse> {
    // Pay Later defers payment - records as receivable
    return {
      success: true,
      reference: payload.transaction_ref,
      status: 'pending',
      message: 'Payment deferred - Balance recorded as receivable',
      provider_data: {
        deferred: true,
        internal: true,
        accounting_impact: {
          debit: 'accounts_receivable',
          credit: 'guest_wallet',
        },
      },
    };
  },
};
