// src/lib/sharedStore.js
import { map } from 'nanostores';

// Create a store for sharing field selections across components
export const sharedFieldStore = map({
  selectedFields: []
});

// Helper function to update field selections
export function updateSelectedFields(fields) {
  sharedFieldStore.setKey('selectedFields', fields);
  
  // Also persist to sessionStorage for survival across page loads
  try {
    sessionStorage.setItem('sharedFieldSelections', JSON.stringify(fields));
  } catch (e) {
    console.error('Error saving shared field selections:', e);
  }
}

// Helper function to load field selections
export function loadSelectedFields() {
  try {
    const saved = sessionStorage.getItem('sharedFieldSelections');
    if (saved) {
      const fields = JSON.parse(saved);
      sharedFieldStore.setKey('selectedFields', fields);
      return fields;
    }
  } catch (e) {
    console.error('Error loading shared field selections:', e);
  }
  return [];
}