export interface PaymentPayload {
  transaction_ref: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  reference: string;
  status: 'pending' | 'success' | 'failed';
  message?: string;
  provider_data?: any;
}

export interface PaymentProvider {
  id: string;
  name: string;
  type: 'pos' | 'online' | 'transfer' | 'cash' | 'credit_deferred';
  init?(config: any): Promise<void>;
  charge(payload: PaymentPayload): Promise<PaymentResponse>;
  reconcile?(reference: string): Promise<boolean>;
  fetchTransactions?(dateRange: { start: Date; end: Date }): Promise<any[]>;
}
