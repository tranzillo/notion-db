// src/components/standalone/ThemeToggle.jsx
import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
  // Initialize state WITHOUT any window/localStorage checks
  // This will render the same on server and client
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // After component mounts, load the real value
  useEffect(() => {
    try {
      // Check for global preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        setIsDarkMode(window.userPreferences.darkMode);
      }
    } catch (e) {
      console.error('Error loading theme preference:', e);
    }
  }, []);
  
  // Toggle theme
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    savePreference(newDarkMode);
  };
  
  // Save preference
  const savePreference = (darkMode) => {
    try {
      // Update global preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        window.userPreferences.darkMode = darkMode;
      }
      
      // Save to localStorage
      const savedPrefs = localStorage.getItem('userPreferences');
      const prefs = savedPrefs ? JSON.parse(savedPrefs) : {};
      prefs.darkMode = darkMode;
      localStorage.setItem('userPreferences', JSON.stringify(prefs));
      
      // Apply theme
      if (darkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    } catch (e) {
      console.error('Error saving theme preference:', e);
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