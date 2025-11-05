import { SMSProvider } from './types';
import { TwilioProvider } from './twilio';
import { TermiiProvider } from './termii';

export function createSMSProvider(
  providerName: string,
  config: any
): SMSProvider {
  switch (providerName) {
    case 'twilio':
      return new TwilioProvider(config.accountSid, config.authToken);
    case 'termii':
      return new TermiiProvider(config.apiKey);
    default:
      throw new Error(`Unknown SMS provider: ${providerName}`);
  }
}

export * from './types';
export { TwilioProvider, TermiiProvider };
