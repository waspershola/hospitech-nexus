export interface PaymentResult {
  success: boolean;
  reference: string;
  message?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  reference: string;
}

export interface PaymentProvider {
  processPayment(amount: number, method: string, metadata?: Record<string, any>): Promise<PaymentResult>;
  verifyPayment(reference: string): Promise<PaymentStatus>;
}

export class PaymentStubAdapter implements PaymentProvider {
  async processPayment(
    amount: number,
    method: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    return {
      success,
      reference: `STUB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      message: success ? 'Payment processed successfully' : 'Payment failed - insufficient funds',
    };
  }

  async verifyPayment(reference: string): Promise<PaymentStatus> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Parse stub reference to determine status
    const isPaid = reference.startsWith('STUB-');

    return {
      status: isPaid ? 'paid' : 'pending',
      amount: 0, // Would come from actual provider
      reference,
    };
  }
}

// Export singleton instance
export const paymentAdapter = new PaymentStubAdapter();
