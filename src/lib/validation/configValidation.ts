export const validateFinancials = (data: any) => {
  const errors: string[] = [];
  
  if (data.vat_rate !== undefined) {
    const vat = Number(data.vat_rate);
    if (isNaN(vat) || vat < 0 || vat > 100) {
      errors.push('VAT rate must be between 0% and 100%');
    }
  }
  
  if (data.service_charge !== undefined) {
    const service = Number(data.service_charge);
    if (isNaN(service) || service < 0 || service > 100) {
      errors.push('Service charge must be between 0% and 100%');
    }
  }
  
  if (data.currency !== undefined && (!data.currency || data.currency.trim() === '')) {
    errors.push('Currency is required');
  }
  
  if (data.currency_symbol !== undefined && (!data.currency_symbol || data.currency_symbol.trim() === '')) {
    errors.push('Currency symbol is required');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateBranding = (data: any) => {
  const errors: string[] = [];
  
  // Color validation (HSL format)
  const hslRegex = /^hsl\(\s*\d+\s+\d+%\s+\d+%\s*\)$/;
  
  if (data.primary_color && !hslRegex.test(data.primary_color)) {
    errors.push('Primary color must be in HSL format');
  }
  
  if (data.secondary_color && !hslRegex.test(data.secondary_color)) {
    errors.push('Secondary color must be in HSL format');
  }
  
  if (data.accent_color && !hslRegex.test(data.accent_color)) {
    errors.push('Accent color must be in HSL format');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateEmailSettings = (data: any) => {
  const errors: string[] = [];
  
  if (data.from_email && !data.from_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push('Invalid from email address');
  }
  
  if (data.reply_to && !data.reply_to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push('Invalid reply-to email address');
  }
  
  if (data.smtp_enabled) {
    if (!data.smtp_host) errors.push('SMTP host is required when SMTP is enabled');
    if (!data.smtp_port) errors.push('SMTP port is required when SMTP is enabled');
    if (!data.smtp_user) errors.push('SMTP user is required when SMTP is enabled');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateHotelMeta = (data: any) => {
  const errors: string[] = [];
  
  if (data.contact_email && !data.contact_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push('Invalid contact email address');
  }
  
  if (data.contact_phone && data.contact_phone.length > 0 && data.contact_phone.length < 10) {
    errors.push('Contact phone must be at least 10 digits');
  }
  
  return { valid: errors.length === 0, errors };
};

export const calculateExampleTotal = (
  baseAmount: number,
  vatRate: number,
  vatInclusive: boolean,
  serviceCharge: number,
  serviceInclusive: boolean,
  currencySymbol: string = '₦'
): string => {
  let vatAmount = 0;
  let serviceAmount = 0;
  
  if (vatInclusive) {
    vatAmount = baseAmount * (vatRate / (100 + vatRate));
  } else {
    vatAmount = baseAmount * (vatRate / 100);
  }
  
  if (serviceInclusive) {
    serviceAmount = baseAmount * (serviceCharge / (100 + serviceCharge));
  } else {
    serviceAmount = baseAmount * (serviceCharge / 100);
  }
  
  const total = vatInclusive && serviceInclusive 
    ? baseAmount
    : baseAmount + vatAmount + serviceAmount;
  
  return `${currencySymbol}${baseAmount.toLocaleString()} + VAT ${vatRate}% (${currencySymbol}${Math.round(vatAmount).toLocaleString()}) + Service ${serviceCharge}% (${currencySymbol}${Math.round(serviceAmount).toLocaleString()}) = ${currencySymbol}${Math.round(total).toLocaleString()}`;
};
