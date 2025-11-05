export interface SMSPayload {
  to: string;
  from: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  cost?: number; // SMS credits consumed (multi-part count)
  error?: string;
  provider: string;
}

export interface SMSProvider {
  name: string;
  send(payload: SMSPayload): Promise<SMSResult>;
  validateConfig(config: any): boolean;
}
