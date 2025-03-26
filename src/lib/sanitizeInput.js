// src/lib/sanitizeInput.js

/**
 * Sanitize a string input to prevent XSS and other injection attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string
 */
export function sanitizeString(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Replace potentially dangerous HTML characters
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .trim();
  }
  
  /**
   * Sanitize a URL to help prevent injection attacks
   * @param {string} url - The URL to sanitize
   * @returns {string} - The sanitized URL
   */
  export function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return '';
    }
    
    // Basic URL validation
    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return '';
      }
      return url.trim();
    } catch (e) {
      // If URL parsing fails, return empty string
      return '';
    }
  }
  
  /**
   * Sanitize a number input
   * @param {any} input - The input to sanitize
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @param {number} defaultValue - Default value if invalid
   * @returns {number} - The sanitized number
   */
  export function sanitizeNumber(input, min, max, defaultValue) {
    const num = parseInt(input);
    if (isNaN(num)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, num));
  }
  
  /**
   * Sanitize form data before submission
   * @param {Object} formData - The form data to sanitize
   * @returns {Object} - The sanitized form data
   */
  export function sanitizeFormData(formData) {
    const sanitized = {};
    
    // Common fields
    sanitized.type = formData.type ? sanitizeString(formData.type) : 'bottleneck';
    sanitized.title = sanitizeString(formData.title);
    sanitized.content = sanitizeString(formData.content);
    sanitized.email = sanitizeString(formData.email);
    
    // Type-specific fields
    if (formData.rank) {
      sanitized.rank = sanitizeNumber(formData.rank, 1, 5, 3);
    }
    
    if (formData.discipline) {
      sanitized.discipline = sanitizeString(formData.discipline);
    }
    
    if (formData.url) {
      sanitized.url = sanitizeUrl(formData.url);
    }
    
    return sanitized;
  }