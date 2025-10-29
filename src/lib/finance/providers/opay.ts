import { PaymentProvider, PaymentPayload, PaymentResponse } from './types';

export const OpayProvider: PaymentProvider = {
  id: 'opay',
  name: 'Opay POS',
  type: 'pos',

  async charge(payload: PaymentPayload): Promise<PaymentResponse> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.1;
    
    return {
      success,
      reference: payload.transaction_ref,
      status: success ? 'success' : 'failed',
      message: success ? 'Transaction successful' : 'Insufficient funds',
    };
  },

  async fetchTransactions(dateRange) {
    return [];
  },
};
