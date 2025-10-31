export interface FormattedMetadataField {
  label: string;
  value: string;
  type: 'currency' | 'boolean' | 'text' | 'number';
  icon?: string;
}

export function formatPaymentMetadata(metadata: Record<string, any>): FormattedMetadataField[] {
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const formatted: FormattedMetadataField[] = [];

  // Field mappings with display order
  const fieldMap: Record<string, { label: string; type: string; icon: string }> = {
    provider_name: { label: 'Payment Provider', type: 'text', icon: '🏦' },
    net_amount: { label: 'Net Amount Received', type: 'currency', icon: '💰' },
    provider_fee: { label: 'Provider Fee', type: 'currency', icon: '💳' },
    is_credit_deferred: { label: 'Credit Deferred', type: 'boolean', icon: '⏳' },
    notes: { label: 'Notes', type: 'text', icon: '📝' },
    approval_reason: { label: 'Approval Reason', type: 'text', icon: '✅' },
    refund_reason: { label: 'Refund Reason', type: 'text', icon: '↩️' },
  };

  // Fields to skip (internal/technical IDs)
  const skipFields = ['location_id', 'provider_id', 'wallet_id', 'tax_breakdown'];

  // Process each field in the metadata
  for (const [key, config] of Object.entries(fieldMap)) {
    const value = metadata[key];
    
    // Skip if undefined, null, or empty string
    if (value === undefined || value === null || value === '') {
      continue;
    }

    let displayValue: string;

    switch (config.type) {
      case 'currency':
        displayValue = `₦${Number(value).toLocaleString('en-NG', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
        break;
      
      case 'boolean':
        displayValue = value ? 'Yes' : 'No';
        break;
      
      case 'number':
        displayValue = Number(value).toLocaleString();
        break;
      
      case 'text':
      default:
        displayValue = String(value);
        break;
    }

    formatted.push({
      label: config.label,
      value: displayValue,
      type: config.type as any,
      icon: config.icon,
    });
  }

  // Handle any additional fields not in the map (but skip internal IDs)
  for (const [key, value] of Object.entries(metadata)) {
    if (
      !fieldMap[key as keyof typeof fieldMap] && 
      !skipFields.includes(key) &&
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      // Convert snake_case to Title Case
      const label = key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      formatted.push({
        label,
        value: String(value),
        type: 'text',
      });
    }
  }

  return formatted;
}
