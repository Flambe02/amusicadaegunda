import DOMPurify from 'dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @param {Object} options - DOMPurify options
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const defaultOptions = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(input, { ...defaultOptions, ...options });
}

/**
 * Sanitize HTML content (allows safe HTML tags)
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Sanitize URL to prevent XSS and malicious redirects
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL or empty string
 */
export function sanitizeURL(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove any HTML tags
  const clean = DOMPurify.sanitize(url, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
  // Basic URL validation
  try {
    const urlObj = new URL(clean);
    // Only allow http, https, and mailto
    if (!['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) {
      return '';
    }
    return clean;
  } catch {
    // If URL parsing fails, return empty
    return '';
  }
}

/**
 * Escape special characters for safe text display
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeHTML(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

