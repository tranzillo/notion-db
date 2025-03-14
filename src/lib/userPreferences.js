// src/lib/userPreferences.js

/**
 * Get user preferences from localStorage
 * @returns {Object} User preferences
 */
export function getUserPreferences() {
    try {
      const savedPreferences = localStorage.getItem('userPreferences');
      return savedPreferences ? JSON.parse(savedPreferences) : {};
    } catch (e) {
      console.error('Error reading user preferences', e);
      return {};
    }
  }
  
  /**
   * Save user preferences to localStorage
   * @param {Object} preferences - Preferences to save
   */
  export function saveUserPreferences(preferences) {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
    } catch (e) {
      console.error('Error saving user preferences', e);
    }
  }
  
  /**
   * Update a specific user preference
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   */
  export function updateUserPreference(key, value) {
    const preferences = getUserPreferences();
    preferences[key] = value;
    saveUserPreferences(preferences);
  }
  
  /**
   * Get a specific user preference
   * @param {string} key - Preference key
   * @param {any} defaultValue - Default value if preference doesn't exist
   * @returns {any} Preference value
   */
  export function getUserPreference(key, defaultValue) {
    const preferences = getUserPreferences();
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  }