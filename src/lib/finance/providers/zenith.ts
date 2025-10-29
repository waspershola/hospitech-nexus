import { PaymentProvider, PaymentPayload, PaymentResponse } from './types';

export const ZenithProvider: PaymentProvider = {
  id: 'zenith',
  name: 'Zenith POS',
  type: 'pos',

  async charge(payload: PaymentPayload): Promise<PaymentResponse> {
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    return {
      success: true,
      reference: payload.transaction_ref,
      status: 'success',
      message: 'Approved',
    };
  },
};
