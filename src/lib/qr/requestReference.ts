/**
 * Generate a short reference code for QR requests in format QR-xxxxxx
 * Uses first 6 characters of request UUID
 */
export function generateRequestReference(requestId: string): string {
  const shortId = requestId.replace(/-/g, '').substring(0, 6).toUpperCase();
  return `QR-${shortId}`;
}

/**
 * Format request reference for display with copy-to-clipboard support
 */
export function formatRequestReference(requestId: string): {
  reference: string;
  displayText: string;
} {
  const reference = generateRequestReference(requestId);
  return {
    reference,
    displayText: `Reference: ${reference}`,
  };
}
