/**
 * Normalize email address for consistent storage and lookup
 * Handles Gmail's dot-ignoring behavior
 */
export const normalizeEmail = (email) => {
  if (!email) return '';
  
  const trimmed = email.trim().toLowerCase();
  const [localPart, domain] = trimmed.split('@');
  
  if (!localPart || !domain) return trimmed;
  
  // Gmail and Google Mail domains ignore dots in the local part
  const gmailDomains = ['gmail.com', 'googlemail.com'];
  if (gmailDomains.includes(domain)) {
    // Remove dots and plus signs (and everything after plus) from local part
    const normalizedLocal = localPart.split('+')[0].replace(/\./g, '');
    return `${normalizedLocal}@${domain}`;
  }
  
  return trimmed;
};

