// src/components/standalone/ViewToggle.jsx
import React, { useState, useEffect } from 'react';
import { updateUserPreference } from '../../lib/userPreferences';

export default function ViewToggle() {
  // Initialize state with a default that will be quickly updated
  const [isListView, setIsListView] = useState(false);

  // After component mounts, load the real value
  useEffect(() => {
    const loadViewPreference = () => {
      try {
        // First check if the DOM already has the attribute (set by InjectHydrationData)
        const hasAttributeInDOM = document.documentElement.dataset.listView === 'true';
        
        // Then check window.userPreferences which is set globally
        const hasPreferenceInWindow = 
          typeof window !== 'undefined' && 
          window.userPreferences && 
          window.userPreferences.isListView;
        
        // Use DOM state first, then fallback to window preference, then localStorage
        let prefersList = hasAttributeInDOM || hasPreferenceInWindow;
        
        // If we couldn't get the preference from DOM or window, check localStorage
        if (!hasAttributeInDOM && !hasPreferenceInWindow) {
          const savedPrefs = localStorage.getItem('userPreferences');
          if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            prefersList = !!prefs.isListView;
          }
        }
        
        setIsListView(prefersList);
      } catch (e) {
        console.error('Error loading view preference:', e);
      }
    };
    
    // Load preference initially
    loadViewPreference();
    
    // Also reload preference after navigation completes
    const handlePageLoad = () => {
      loadViewPreference();
    };
    
    document.addEventListener('astro:page-load', handlePageLoad);
    
    return () => {
      document.removeEventListener('astro:page-load', handlePageLoad);
    };
  }, []);

  // Toggle to grid view
  const setGridView = () => {
    setIsListView(false);
    savePreference(false);
  };

  // Toggle to list view
  const setListView = () => {
    setIsListView(true);
    savePreference(true);
  };

  // Save preference and notify other components
  const savePreference = (listView) => {
    try {
      // Update localStorage
      updateUserPreference('isListView', listView);
      
      // Update global variable for other components
      if (typeof window !== 'undefined') {
        window.userPreferences = window.userPreferences || {};
        window.userPreferences.isListView = listView;
      }
      
      // Apply list view to document
      applyView(listView);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('view-changed', {
        detail: { isListView: listView }
      }));
    } catch (e) {
      console.error('Error saving view preference:', e);
    }
  };
  
  // Apply view to document
  const applyView = (listView) => {
    // Update data attribute
    document.documentElement.dataset.listView = listView ? 'true' : 'false';
    
    // Update grid elements
    const grids = document.querySelectorAll('.bottleneck-grid');
    if (listView) {
      grids.forEach(grid => grid.classList.add('bottleneck-grid--list-view'));
    } else {
      grids.forEach(grid => grid.classList.remove('bottleneck-grid--list-view'));
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