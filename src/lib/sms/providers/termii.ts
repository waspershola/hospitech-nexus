import { SMSProvider, SMSPayload, SMSResult } from './types';

export class TermiiProvider implements SMSProvider {
  name = 'termii';
  
  constructor(private apiKey: string) {}

  async send(payload: SMSPayload): Promise<SMSResult> {
    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: payload.to,
          from: payload.from,
          sms: payload.message,
          type: 'plain',
          channel: 'generic',
        }),
      });

      const data = await response.json();

      if (data.message_id) {
        // Estimate SMS segments (160 chars per segment)
        const segmentCount = Math.ceil(payload.message.length / 160);
        
        return {
          success: true,
          messageId: data.message_id,
          cost: segmentCount,
          provider: this.name,
        };
      }

      return {
        success: false,
        error: data.message || 'Termii API error',
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
    return !!config.apiKey;
  }
}
