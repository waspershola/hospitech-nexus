export interface TemplateContext {
  guestName: string;
  hotelName: string;
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  bookingReference?: string;
  balance?: number;
  currency?: string;
  [key: string]: any;
}

export function renderSMSTemplate(
  template: string,
  context: TemplateContext
): string {
  // Simple template rendering with {{variable}} syntax
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key]?.toString() || '';
  });
}

// Default templates
export const DEFAULT_TEMPLATES = {
  booking_confirmed: `Hi {{guestName}}, your booking at {{hotelName}} is confirmed! Room: {{roomNumber}}, Check-in: {{checkInDate}}. Ref: {{bookingReference}}`,
  
  checkin_reminder: `Hi {{guestName}}, reminder: Your check-in at {{hotelName}} is tomorrow ({{checkInDate}}). Room {{roomNumber}} will be ready. See you soon!`,
  
  checkout_reminder: `Hi {{guestName}}, checkout from {{hotelName}} Room {{roomNumber}} is at {{checkOutTime}} today. Outstanding balance: {{currency}}{{balance}}. Safe travels!`,
};
