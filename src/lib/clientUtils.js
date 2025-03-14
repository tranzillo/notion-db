// src/lib/clientUtils.js

/**
 * Function to safely run client-side code, returning a default value during SSR
 * @param {Function} clientFn - Function to run on client-side
 * @param {any} defaultValue - Default value to return during SSR
 * @returns {any} Result of clientFn or defaultValue
 */
export function clientSide(clientFn, defaultValue) {
    if (typeof window !== 'undefined') {
      try {
        return clientFn();
      } catch (e) {
        console.error('Error in client-side code:', e);
        return defaultValue;
      }
    }
    return defaultValue;
  }
  
  /**
   * Get user preferences from localStorage, safely for SSR
   * @param {string} key - Preference key
   * @param {any} defaultValue - Default value
   * @returns {any} Preference value or default
   */
  export function getPreference(key, defaultValue) {
    return clientSide(() => {
      const savedPreferences = localStorage.getItem('userPreferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
      }
      return defaultValue;
    }, defaultValue);
  }