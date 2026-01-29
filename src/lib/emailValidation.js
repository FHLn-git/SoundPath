// Email validation utility
// Checks for valid email format and common disposable/temporary email domains

// List of common disposable/temporary email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  '20minutemail.com',
  '33mail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'getnada.com',
  'mohmal.com',
  'fakeinbox.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'bccto.me',
  'chammy.info',
  'devnullmail.com',
  'dispostable.com',
  'emailondeck.com',
  'fakemailgenerator.com',
  'getairmail.com',
  'inboxbear.com',
  'mailcatch.com',
  'mailexpire.com',
  'mailforspam.com',
  'mailfreeonline.com',
  'mailin8r.com',
  'mailinator.net',
  'mailmoat.com',
  'mailsac.com',
  'mailtemp.info',
  'meltmail.com',
  'mintemail.com',
  'mytrashmail.com',
  'nada.email',
  'nospamfor.us',
  'nowmymail.com',
  'putthisinyourspamdatabase.com',
  'rcpt.at',
  'recode.me',
  'safetymail.info',
  'sendspamhere.com',
  'spamgourmet.com',
  'spamherelots.com',
  'spamhereplease.com',
  'spamhole.com',
  'spamify.com',
  'spamtraps.com',
  'tempail.com',
  'tempinbox.co.uk',
  'tempmail.eu',
  'tempmail.it',
  'tempmail2.com',
  'tempymail.com',
  'thankyou2010.com',
  'thisisnotmyrealemail.com',
  'throwawaymail.com',
  'tmail.ws',
  'trashmail.com',
  'trashmail.net',
  'trashymail.com',
  'tyldd.com',
  'whyspam.me',
  'willselfdestruct.com',
  'zippymail.info',
]

// Basic email format regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export const validateEmail = email => {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email is required',
    }
  }

  const trimmedEmail = email.trim().toLowerCase()

  // Check basic format
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
    }
  }

  // Check for disposable/temporary email domains
  const domain = trimmedEmail.split('@')[1]
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return {
      valid: false,
      error: 'Disposable email addresses are not allowed. Please use a permanent email address.',
    }
  }

  // Additional checks
  if (trimmedEmail.length > 254) {
    return {
      valid: false,
      error: 'Email address is too long',
    }
  }

  // Check for common typos or invalid patterns
  if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
    }
  }

  // Check domain has at least one dot (TLD)
  const domainParts = domain?.split('.')
  if (!domainParts || domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
    }
  }

  return {
    valid: true,
    error: null,
  }
}

/**
 * Validates email format only (for real-time validation)
 * @param {string} email - The email address to validate
 * @returns {boolean} - true if format is valid
 */
export const isValidEmailFormat = email => {
  if (!email || typeof email !== 'string') return false
  return EMAIL_REGEX.test(email.trim())
}
