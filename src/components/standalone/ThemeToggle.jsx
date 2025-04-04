import React, { useState, useEffect } from 'react';
import { updateUserPreference } from '../../lib/userPreferences';

export default function ThemeToggle() {
  // Initialize with a default that will be quickly updated
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Use effect to load the actual value after mount
  useEffect(() => {
    const loadThemePreference = () => {
      try {
        // First check if the DOM already has the class (it might be set by InjectHydrationData)
        const hasClassInDOM = document.documentElement.classList.contains('dark-mode');
        
        // Then check window.userPreferences which is set globally
        const hasPreferenceInWindow = 
          typeof window !== 'undefined' && 
          window.userPreferences && 
          window.userPreferences.darkMode;
        
        // Use DOM state first, then fallback to window preference, then localStorage
        let prefersDark = hasClassInDOM || hasPreferenceInWindow;
        
        // If we couldn't get the preference from DOM or window, check localStorage
        if (!hasClassInDOM && !hasPreferenceInWindow) {
          const savedPrefs = localStorage.getItem('userPreferences');
          if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            prefersDark = !!prefs.darkMode;
          } else {
            // Final fallback: check system preference
            prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          }
        }
        
        setIsDarkMode(prefersDark);
      } catch (e) {
        console.error('Error loading theme preference:', e);
      }
    };
    
    // Load preference initially
    loadThemePreference();
    
    // Also reload preference after navigation completes
    const handlePageLoad = () => {
      loadThemePreference();
    };
    
    // Handle browser history navigation
    const handlePopState = () => {
      loadThemePreference();
    };
    
    document.addEventListener('astro:page-load', handlePageLoad);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      document.removeEventListener('astro:page-load', handlePageLoad);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  
  // Toggle theme
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // Update localStorage
    updateUserPreference('darkMode', newDarkMode);
    
    // Update global variable for other components
    if (typeof window !== 'undefined') {
      window.userPreferences = window.userPreferences || {};
      window.userPreferences.darkMode = newDarkMode;
    }
    
    // Apply theme to document
    applyTheme(newDarkMode);
    
    // Dispatch a custom event for other components
    window.dispatchEvent(new CustomEvent('theme-changed', { 
      detail: { isDarkMode: newDarkMode } 
    }));
  };
  
  // Apply theme to document
  const applyTheme = (darkMode) => {
    // Update data attribute
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    
    // Update class
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      )}
    </button>
  );
}