// src/components/standalone/ViewToggle.jsx
import React, { useState, useEffect } from 'react';

export default function ViewToggle() {
  // Initialize state WITHOUT any window/localStorage checks
  const [isListView, setIsListView] = useState(false);

  // After component mounts, load the real value
  useEffect(() => {
    try {
      // Check for global preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        setIsListView(window.userPreferences.isListView);
      }
    } catch (e) {
      console.error('Error loading view preference:', e);
    }
  }, []);

  // Toggle to grid view
  const setGridView = () => {
    setIsListView(false);
    savePreference(false);

    // Update the UI for all grid elements immediately
    const grids = document.querySelectorAll('.bottleneck-grid');
    grids.forEach(grid => grid.classList.remove('bottleneck-grid--list-view'));
  };

  // Toggle to list view
  const setListView = () => {
    setIsListView(true);
    savePreference(true);

    // Update the UI for all grid elements immediately
    const grids = document.querySelectorAll('.bottleneck-grid');
    grids.forEach(grid => grid.classList.add('bottleneck-grid--list-view'));
  };

  // Save preference and notify other components
  const savePreference = (listView) => {
    try {
      // Update global preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        window.userPreferences.isListView = listView;
      }

      // Save to localStorage
      const savedPrefs = localStorage.getItem('userPreferences');
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.isListView = listView;
      localStorage.setItem('userPreferences', JSON.stringify(prefs));

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('view-changed', {
        detail: { isListView: listView }
      }));

      // Also update the data attribute for potential SSR
      document.documentElement.dataset.listView = listView ? 'true' : 'false';
    } catch (e) {
      console.error('Error saving view preference:', e);
    }
  };

  return (
    <div className="view-toggle">
      <button
        className={`view-toggle__button ${isListView ? 'active' : ''}`}
        onClick={setListView}
        aria-label="List view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
      <button
        className={`view-toggle__button ${!isListView ? 'active' : ''}`}
        onClick={setGridView}
        aria-label="Grid view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
        </svg>
      </button>

    </div>
  );
}