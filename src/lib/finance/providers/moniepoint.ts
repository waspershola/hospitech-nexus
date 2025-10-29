import { PaymentProvider, PaymentPayload, PaymentResponse } from './types';

export const MoniepointProvider: PaymentProvider = {
  id: 'moniepoint',
  name: 'Moniepoint POS',
  type: 'pos',

  async charge(payload: PaymentPayload): Promise<PaymentResponse> {
    // Simulate POS transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.05;
    
    return {
      success,
      reference: payload.transaction_ref,
      status: success ? 'success' : 'failed',
      message: success ? 'Payment approved' : 'Payment declined',
      provider_data: {
        terminal_id: 'MP-TERM-001',
        approval_code: success ? `MP${Date.now()}` : null,
      },
    };
  },

  async fetchTransactions(dateRange) {
    // Stub: Would fetch from Moniepoint API
    return [
      {
        reference: `MP-${Date.now()}`,
        amount: 25000,
        date: new Date().toISOString(),
        status: 'success',
      },
    ];
  },
};
