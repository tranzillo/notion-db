// src/lib/preferenceStore.js
import { atom, computed, map } from 'nanostores';

// src/lib/preferenceStore.js

// Update the userPreferences map to include viewType
export const userPreferences = map({
  darkMode: false,
  isListView: false,
  isGraphView: false,
  viewType: 'grid',
  initialized: false
});

// Update initializePreferences function to load viewType
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
      
      // Handle viewType and the backward-compatible flags
      const viewType = prefs.viewType || (prefs.isListView ? 'list' : (prefs.isGraphView ? 'graph' : 'grid'));
      userPreferences.setKey('viewType', viewType);
      userPreferences.setKey('isListView', viewType === 'list');
      userPreferences.setKey('isGraphView', viewType === 'graph');
    } else {
      // Default to system preference for dark mode
      userPreferences.setKey('darkMode', 
        window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      // Default view is grid
      userPreferences.setKey('viewType', 'grid');
      userPreferences.setKey('isListView', false);
      userPreferences.setKey('isGraphView', false);
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

// Update applyPreferences to include viewType
export function applyPreferences() {
  const { darkMode, viewType, isListView, isGraphView } = userPreferences.get();
  
  // Apply theme
  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  if (darkMode) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  
  // Apply view mode using viewType
  document.documentElement.dataset.listView = (viewType === 'list') ? 'true' : 'false';
  document.documentElement.dataset.graphView = (viewType === 'graph') ? 'true' : 'false';
  
  // Update grids if they exist
  document.querySelectorAll('.bottleneck-grid').forEach(grid => {
    // First remove any existing view classes
    grid.classList.remove('bottleneck-grid--list-view');
    grid.classList.remove('bottleneck-grid--graph-view');
    
    // Add the appropriate class
    if (viewType === 'list') {
      grid.classList.add('bottleneck-grid--list-view');
    } else if (viewType === 'graph') {
      grid.classList.add('bottleneck-grid--graph-view');
    }
  });
}

// Update the preference update function
export function updatePreference(key, value) {
  userPreferences.setKey(key, value);
  
  try {
    // Handling viewType specifically
    if (key === 'viewType') {
      // Also update the convenience boolean flags
      userPreferences.setKey('isListView', value === 'list');
      userPreferences.setKey('isGraphView', value === 'graph');
    }
    
    // Save all preferences to localStorage
    const prefs = userPreferences.get();
    const prefsToSave = { 
      darkMode: prefs.darkMode, 
      viewType: prefs.viewType,
      isListView: prefs.isListView,
      isGraphView: prefs.isGraphView
    };
    localStorage.setItem('userPreferences', JSON.stringify(prefsToSave));
    
    // Apply to document
    applyPreferences();
    
    // Notify components via custom event
    window.dispatchEvent(new CustomEvent(`${key}-changed`, { 
      detail: { [key]: value } 
    }));
    
    // For viewType changes, also dispatch a unified event with all view info
    if (key === 'viewType') {
      window.dispatchEvent(new CustomEvent('view-changed', { 
        detail: { 
          viewType: value,
          isListView: value === 'list',
          isGraphView: value === 'graph'
        } 
      }));
    }
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}