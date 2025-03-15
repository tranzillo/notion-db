// src/lib/userPreferences.js

/**
 * Get user preferences from localStorage
 * @returns {Object} User preferences
 */
export function getUserPreferences() {
  if (typeof window === 'undefined') {
    return {};
  }
  
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
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    
    // Also update the global object for sharing between components
    window.userPreferences = window.userPreferences || {};
    Object.assign(window.userPreferences, preferences);
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
  if (typeof window === 'undefined') {
    return;
  }
  
  const preferences = getUserPreferences();
  preferences[key] = value;
  saveUserPreferences(preferences);
  
  // Update global state
  window.userPreferences = window.userPreferences || {};
  window.userPreferences[key] = value;
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent(`${key}-changed`, { 
    detail: { [key]: value } 
  }));
  
  // Apply changes to document
  if (key === 'darkMode') {
    document.documentElement.dataset.theme = value ? 'dark' : 'light';
    if (value) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  } else if (key === 'isListView') {
    document.documentElement.dataset.listView = value ? 'true' : 'false';
    
    // Update grid elements
    const grids = document.querySelectorAll('.bottleneck-grid');
    if (value) {
      grids.forEach(grid => grid.classList.add('bottleneck-grid--list-view'));
    } else {
      grids.forEach(grid => grid.classList.remove('bottleneck-grid--list-view'));
    }
  }
}

/**
 * Get a specific user preference - safe for SSR
 * @param {string} key - Preference key
 * @param {any} defaultValue - Default value if preference doesn't exist
 * @returns {any} Preference value
 */
export function getUserPreference(key, defaultValue) {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  // First check global window object
  if (window.userPreferences && window.userPreferences[key] !== undefined) {
    return window.userPreferences[key];
  }
  
  // Then check localStorage
  const preferences = getUserPreferences();
  return preferences[key] !== undefined ? preferences[key] : defaultValue;
}