import { PaymentProvider, PaymentPayload, PaymentResponse } from './types';

export const BankTransferProvider: PaymentProvider = {
  id: 'bank_transfer',
  name: 'Bank Transfer',
  type: 'transfer',

  async charge(payload: PaymentPayload): Promise<PaymentResponse> {
    // Bank transfers are typically manual verification
    return {
      success: true,
      reference: payload.transaction_ref,
      status: 'pending',
      message: 'Transfer initiated - awaiting confirmation',
    };
  },

  async reconcile(reference: string): Promise<boolean> {
    // Would check bank API for confirmation
    return true;
  },
};
