/**
 * Staff Management Utilities
 * Helper functions for employee ID generation, validation, and formatting
 */

// Department prefix mapping for employee IDs
const DEPARTMENT_PREFIX_MAP: Record<string, string> = {
  front_office: 'FRD',
  housekeeping: 'HSK',
  food_beverage: 'FNB',
  kitchen: 'KIT',
  bar: 'BAR',
  inventory: 'INV',
  maintenance: 'MNT',
  security: 'SEC',
  accounts: 'ACC',
  hr: 'HRD',
  management: 'MGT',
};

/**
 * Generate employee ID
 * Format: PREFIX-YEAR-SEQUENCE (e.g., FRD-2024-001)
 */
export function generateEmployeeId(
  department: string,
  year: number = new Date().getFullYear(),
  sequence: number = 1
): string {
  const prefix = DEPARTMENT_PREFIX_MAP[department] || 'STF';
  const sequenceStr = sequence.toString().padStart(3, '0');
  return `${prefix}-${year}-${sequenceStr}`;
}

/**
 * Parse employee ID to extract components
 */
export function parseEmployeeId(employeeId: string): {
  prefix: string;
  year: number;
  sequence: number;
} | null {
  const match = employeeId.match(/^([A-Z]{3})-(\d{4})-(\d{3})$/);
  if (!match) return null;
  
  return {
    prefix: match[1],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}

/**
 * Format phone number to Nigerian format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with +234
  if (digits.startsWith('0')) {
    return '+234' + digits.substring(1);
  }
  
  // If starts with 234, add +
  if (digits.startsWith('234')) {
    return '+' + digits;
  }
  
  // If already has +234, return as is
  if (phone.startsWith('+234')) {
    return phone;
  }
  
  // Otherwise assume local number and add +234
  return '+234' + digits;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return /^\+234\d{10}$/.test(formatted);
}

/**
 * Validate National ID format
 * Nigerian National ID: 11 digits
 */
export function validateNationalId(id: string): boolean {
  return /^\d{11}$/.test(id.replace(/\s/g, ''));
}

/**
 * Validate employee ID format
 */
export function validateEmployeeId(employeeId: string): boolean {
  return /^[A-Z]{3}-\d{4}-\d{3}$/.test(employeeId);
}

/**
 * Format currency (Nigerian Naira)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

/**
 * Get next employee sequence number
 */
export function getNextSequence(existingIds: string[], department: string): number {
  const prefix = DEPARTMENT_PREFIX_MAP[department] || 'STF';
  const year = new Date().getFullYear();
  
  // Filter IDs for current department and year
  const relevantIds = existingIds
    .filter(id => id.startsWith(`${prefix}-${year}`))
    .map(id => parseEmployeeId(id))
    .filter((parsed): parsed is NonNullable<typeof parsed> => parsed !== null)
    .map(parsed => parsed.sequence);
  
  if (relevantIds.length === 0) return 1;
  
  return Math.max(...relevantIds) + 1;
}

/**
 * Get access level display name
 */
export function getAccessLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    staff: 'Staff',
    supervisor: 'Supervisor',
    manager: 'Manager',
  };
  return labels[level] || level;
}

/**
 * Get employment type display name
 */
export function getEmploymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    contract: 'Contract',
    intern: 'Intern',
  };
  return labels[type] || type;
}

/**
 * Get shift group display name
 */
export function getShiftGroupLabel(shift: string): string {
  const labels: Record<string, string> = {
    morning: 'Morning (6AM - 2PM)',
    afternoon: 'Afternoon (2PM - 10PM)',
    night: 'Night (10PM - 6AM)',
  };
  return labels[shift] || shift;
}

/**
 * Validate bank account number (Nigerian format: 10 digits)
 */
export function validateBankAccount(accountNumber: string): boolean {
  return /^\d{10}$/.test(accountNumber.replace(/\s/g, ''));
}
