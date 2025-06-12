// src/lib/slugUtils.js

/**
 * Creates a URL-friendly slug from a string
 * Handles special characters, removes unwanted characters,
 * and ensures consistent behavior across the application
 * 
 * @param {string} text - The text to convert to a slug
 * @param {boolean} lowercase - Whether to convert to lowercase (default: true)
 * @returns {string} - The generated slug
 */
export function createSlug(text, lowercase = true) {
  if (!text) return 'untitled';

  // Special case handling - we'll explicitly replace common problematic characters
  // before doing general sanitization
  let slug = text;
  
  // Explicitly handle common special characters before general sanitization
  const replacements = {
    '\'': '',  // single quotes
    '"': '',   // double quotes
    '"': '',   // curly double quotes left
    '"': '',   // curly double quotes right
    '(': '',   // opening parenthesis
    ')': '',   // closing parenthesis
    '[': '',   // opening bracket
    ']': '',   // closing bracket
    '{': '',   // opening brace
    '}': '',   // closing brace
    '?': '',   // question mark
    ':': '',   // colon
    ';': '',   // semicolon
    '!': '',   // exclamation mark
    '@': '',   // at sign
    '#': '',   // hash
    '$': '',   // dollar sign
    '%': '',   // percent
    '^': '',   // caret
    '*': '',   // asterisk
    '+': '',   // plus
    '=': '',   // equals
    '|': '',   // pipe
    '\\': '',  // backslash
    '/': '',   // forward slash
    '<': '',   // less than
    '>': '',   // greater than
    '&': '',   // ampersand
    '~': '',   // tilde
    '`': '',   // backtick
    '…': '',   // ellipsis
    '–': '-',  // en dash to hyphen
    '—': '-',  // em dash to hyphen
    '•': '',   // bullet
    '©': '',   // copyright
    '®': '',   // registered
    '™': '',   // trademark
  };
  
  // Apply each replacement
  for (const [char, replacement] of Object.entries(replacements)) {
    slug = slug.split(char).join(replacement);
  }
  
  // Convert to lowercase if requested
  if (lowercase) {
    slug = slug.toLowerCase();
  }
  
  // Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-');
  
  // Remove all characters that aren't alphanumeric, hyphens, or periods
  // This is a safety net to catch any other characters we missed in our replacements
  slug = slug.replace(/[^\w\-\.]/g, '');
  
  // Replace multiple hyphens with a single hyphen
  slug = slug.replace(/\-{2,}/g, '-');
  
  // Remove leading and trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');
  
  // If slug is empty after sanitization, return 'untitled'
  return slug || 'untitled';
}

/**
 * Checks if a string is a valid slug
 * 
 * @param {string} slug - The slug to validate
 * @returns {boolean} - Whether the slug is valid
 */
export function isValidSlug(slug) {
  if (!slug) return false;
  
  // Valid slugs contain only alphanumeric characters, hyphens, and periods
  return /^[\w\-\.]+$/.test(slug);
}

/**
 * Creates a slug from a field name
 * This is a specialized version for field/discipline filtering
 * 
 * @param {string} fieldName - The field name to slugify
 * @returns {string} - The field slug
 */
export function createFieldSlug(fieldName) {
  return createSlug(fieldName);
}

/**
 * Creates a slug from a bottleneck name
 * 
 * @param {string} bottleneckName - The bottleneck name to slugify
 * @returns {string} - The bottleneck slug
 */
export function createBottleneckSlug(bottleneckName) {
  return createSlug(bottleneckName);
}

/**
 * Creates a slug from a foundational capability name
 * 
 * @param {string} fcName - The foundational capability name to slugify
 * @returns {string} - The capability slug
 */
export function createCapabilitySlug(fcName) {
  return createSlug(fcName);
}

/**
 * Log details about slug conversion for debugging
 * 
 * @param {string} original - The original text
 * @param {string} slug - The generated slug 
 */
export function debugSlug(original, slug) {
  console.log(`Original: "${original}"`);
  console.log(`Slug:     "${slug}"`);
  
  // Show character codes for debugging
  console.log('Original char codes:', [...original].map(c => c.charCodeAt(0)));
  console.log('Slug char codes:', [...slug].map(c => c.charCodeAt(0)));
}

export default {
  createSlug,
  isValidSlug,
  createFieldSlug,
  createBottleneckSlug,
  createCapabilitySlug,
  debugSlug
};