// src/lib/preferenceStore.js
import { atom, computed, map } from 'nanostores';

// Create a store for user preferences
export const userPreferences = map({
  darkMode: false,
  isListView: false,
  initialized: false
});

// Initialize preferences from localStorage
export function initializePreferences() {
  if (typeof window === 'undefined' || userPreferences.get().initialized) return;
  
  try {
    // Check localStorage
    const savedPrefs = localStorage.getItem('userPreferences');
    
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      
      // Update with saved preferences
      userPreferences.setKey('darkMode', 
        typeof prefs.darkMode === 'boolean' ? prefs.darkMode : 
        window.matchMedia('(prefers-color-scheme: dark)').matches);
        
      userPreferences.setKey('isListView', 
        typeof prefs.isListView === 'boolean' ? prefs.isListView : false);
    } else {
      // Default to system preference for dark mode
      userPreferences.setKey('darkMode', 
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    
    // Mark as initialized
    userPreferences.setKey('initialized', true);
    
    // Apply preferences to document
    applyPreferences();
    
    // Set up system theme change listener
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', (e) => {
      // Only change if user hasn't explicitly set a preference
      if (!localStorage.getItem('userPreferences')) {
        userPreferences.setKey('darkMode', e.matches);
        applyPreferences();
      }
    });
  } catch (error) {
    console.error('Error initializing preferences:', error);
  }
}

// Apply current preferences to document
export function applyPreferences() {
  const { darkMode, isListView } = userPreferences.get();
  
  // Apply theme
  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  if (darkMode) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  
  // Apply view mode
  document.documentElement.dataset.listView = isListView ? 'true' : 'false';
  
  // Update grids if they exist
  document.querySelectorAll('.bottleneck-grid').forEach(grid => {
    if (isListView) {
      grid.classList.add('bottleneck-grid--list-view');
    } else {
      grid.classList.remove('bottleneck-grid--list-view');
    }
  });
}

// Update a preference and persist changes
export function updatePreference(key, value) {
  userPreferences.setKey(key, value);
  
  try {
    // Save to localStorage
    const prefs = userPreferences.get();
    const prefsToSave = { 
      darkMode: prefs.darkMode, 
      isListView: prefs.isListView 
    };
    localStorage.setItem('userPreferences', JSON.stringify(prefsToSave));
    
    // Apply to document
    applyPreferences();
    
    // Notify components via custom event
    window.dispatchEvent(new CustomEvent(`${key}-changed`, { 
      detail: { [key]: value } 
    }));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}