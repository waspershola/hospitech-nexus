import { SMSProvider, SMSPayload, SMSResult } from './types';

export class TwilioProvider implements SMSProvider {
  name = 'twilio';
  
  constructor(
    private accountSid: string,
    private authToken: string
  ) {}

  async send(payload: SMSPayload): Promise<SMSResult> {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: payload.from,
            To: payload.to,
            Body: payload.message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Twilio API error',
          provider: this.name,
        };
      }

      // Calculate SMS segments (Twilio returns num_segments)
      const segmentCount = data.num_segments || 1;

      return {
        success: true,
        messageId: data.sid,
        cost: segmentCount,
        provider: this.name,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: this.name,
      };
    }
  }

  validateConfig(config: any): boolean {
    return !!(config.accountSid && config.authToken);
  }
}
