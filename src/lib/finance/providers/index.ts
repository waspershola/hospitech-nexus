import { PaymentProvider } from './types';
import { MoniepointProvider } from './moniepoint';
import { OpayProvider } from './opay';
import { ZenithProvider } from './zenith';
import { BankTransferProvider } from './bankTransfer';
import { CashProvider } from './cash';
import { PayLaterProvider } from './payLater';

export const AVAILABLE_PROVIDERS: Record<string, PaymentProvider> = {
  moniepoint: MoniepointProvider,
  opay: OpayProvider,
  zenith: ZenithProvider,
  bank_transfer: BankTransferProvider,
  cash: CashProvider,
  pay_later: PayLaterProvider,
};

export function getProvider(providerId: string): PaymentProvider | null {
  return AVAILABLE_PROVIDERS[providerId] || null;
}

export * from './types';
