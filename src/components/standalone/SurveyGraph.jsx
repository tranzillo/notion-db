import { useEffect, useRef, useState } from 'react';

// Format title for URL while preserving capitalization and punctuation
function formatTitleForUrl(title) {
  if (!title) return '';
  
  // Format like Metaculus expects: spaces become +, special chars get URL encoded
  // but + signs should remain as + (not %2B)
  return title
    .trim()
    .replace(/\s+/g, '+') // Replace spaces with plus signs first
    .replace(/,/g, '%2C') // Encode commas
    .replace(/\?/g, '%3F') // Encode question marks
    .replace(/!/g, '%21') // Encode exclamation marks
    .replace(/:/g, '%3A') // Encode colons
    .replace(/;/g, '%3B') // Encode semicolons
    .replace(/&/g, '%26') // Encode ampersands
    .replace(/=/g, '%3D') // Encode equals signs
    .replace(/#/g, '%23') // Encode hash symbols
    .replace(/\(/g, '%28') // Encode opening parentheses
    .replace(/\)/g, '%29'); // Encode closing parentheses
}

// SurveyGraph component that displays a Metaculus embed via iframe
export default function SurveyGraph({ metaculus_id, metaculus_title, zoom = 'all' }) {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  const themeChangeTimeoutRef = useRef(null);

  // Function to detect current theme
  const detectCurrentTheme = () => {
    // Check multiple sources for theme (matching the app's pattern)
    if (typeof window !== 'undefined') {
      // 1. Check data-theme attribute
      const dataTheme = document.documentElement.dataset.theme;
      if (dataTheme === 'dark' || dataTheme === 'light') {
        return dataTheme;
      }
      
      // 2. Check dark-mode class
      if (document.documentElement.classList.contains('dark-mode')) {
        return 'dark';
      }
      
      // 3. Check window.userPreferences
      if (window.userPreferences?.darkMode !== undefined) {
        return window.userPreferences.darkMode ? 'dark' : 'light';
      }
      
      // 4. Check localStorage
      try {
        const stored = localStorage.getItem('userPreferences');
        if (stored) {
          const prefs = JSON.parse(stored);
          if (prefs.darkMode !== undefined) {
            return prefs.darkMode ? 'dark' : 'light';
          }
        }
      } catch (e) {
        // localStorage might not be available
      }
      
      // 5. Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    
    // Default to light theme
    return 'light';
  };

  // Effect to set up theme detection and listeners
  useEffect(() => {
    // Set initial theme
    const initialTheme = detectCurrentTheme();
    setCurrentTheme(initialTheme);
    
    // Use a ref to track the current theme value in callbacks
    const currentThemeRef = { current: initialTheme };
    
    // Listen for theme changes
    const handleThemeChange = (event) => {
      let newTheme;
      
      // Handle different event types
      if (event.detail && typeof event.detail.isDarkMode === 'boolean') {
        newTheme = event.detail.isDarkMode ? 'dark' : 'light';
      } else {
        // Fallback: re-detect theme from DOM/preferences
        newTheme = detectCurrentTheme();
      }
      
      if (newTheme !== currentThemeRef.current) {
        currentThemeRef.current = newTheme;
        
        // Clear any existing timeout
        if (themeChangeTimeoutRef.current) {
          clearTimeout(themeChangeTimeoutRef.current);
        }
        
        // Debounce theme changes to prevent rapid reloading
        themeChangeTimeoutRef.current = setTimeout(() => {
          setIsThemeChanging(true);
          setCurrentTheme(newTheme);
        }, 150); // Small delay to debounce
      }
    };

    // Listen for system theme changes
    const handleSystemThemeChange = (e) => {
      if (!window.userPreferences || window.userPreferences.darkMode === undefined) {
        // Only respond to system changes if no explicit preference is set
        const newTheme = e.matches ? 'dark' : 'light';
        if (newTheme !== currentThemeRef.current) {
          currentThemeRef.current = newTheme;
          
          // Clear any existing timeout
          if (themeChangeTimeoutRef.current) {
            clearTimeout(themeChangeTimeoutRef.current);
          }
          
          // Debounce theme changes
          themeChangeTimeoutRef.current = setTimeout(() => {
            setIsThemeChanging(true);
            setCurrentTheme(newTheme);
          }, 150);
        }
      }
    };

    if (typeof window !== 'undefined') {
      // Listen for custom theme change events
      window.addEventListener('theme-changed', handleThemeChange);
      window.addEventListener('darkMode-changed', handleThemeChange);
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        window.removeEventListener('theme-changed', handleThemeChange);
        window.removeEventListener('darkMode-changed', handleThemeChange);
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
        clearInterval(themeCheckInterval);
        
        // Clean up timeout
        if (themeChangeTimeoutRef.current) {
          clearTimeout(themeChangeTimeoutRef.current);
        }
      };
    }
  }, []);

  // Effect to handle iframe loading and reloading
  useEffect(() => {
    if (!metaculus_id || !metaculus_title) {
      setHasError(true);
      setErrorMessage('Missing required Metaculus ID or title');
      setIsLoading(false);
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    // Reset loading state when theme changes or initial load
    setIsLoading(true);
    setHasError(false);

    // Format the title for URL usage (preserving capitalization and punctuation)
    const formattedTitle = formatTitleForUrl(metaculus_title);
    
    // Construct the embed URL using the current theme
    const embedUrl = `https://www.metaculus.com/questions/embed/${metaculus_id}?theme=${currentTheme}&embedTitle=${formattedTitle}&zoom=${zoom}`;
    
    
    // Clear iframe first to prevent sizing issues
    iframe.src = 'about:blank';
    
    // Small delay to ensure the iframe is cleared before loading new content
    const loadDelay = setTimeout(() => {
      // Handle iframe load event
      function onIframeLoad() {
        // Give the iframe content more time to render properly
        setTimeout(() => {
          setIsLoading(false);
          setIsThemeChanging(false);
        }, 1500); // Increased timeout for better stability
      }

      // Handle iframe error
      function onIframeError() {
        setHasError(true);
        setErrorMessage('Failed to load Metaculus embed');
        setIsLoading(false);
        setIsThemeChanging(false);
      }

      // Set timeout fallback in case load event doesn't fire
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
        setIsThemeChanging(false);
      }, 8000); // Increased timeout

      iframe.addEventListener('load', onIframeLoad);
      iframe.addEventListener('error', onIframeError);
      
      // Set the iframe source to start loading
      iframe.src = embedUrl;
      
      // Store cleanup functions for this specific load
      iframe._currentCleanup = () => {
        clearTimeout(timeoutId);
        clearTimeout(loadDelay);
        iframe.removeEventListener('load', onIframeLoad);
        iframe.removeEventListener('error', onIframeError);
      };
    }, 100); // Small delay before loading new content

    // Cleanup function
    return function cleanup() {
      if (iframe && iframe._currentCleanup) {
        iframe._currentCleanup();
      }
    };
  }, [metaculus_id, metaculus_title, currentTheme, zoom]);

  if (hasError) {
    return (
      <div 
        className="survey-graph-error"
        style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--card-background, #f8f9fa)',
          borderRadius: '8px',
          border: '1px solid var(--border-dull, #ddd)',
          color: 'var(--text-light, #666)'
        }}
      >
        <p style={{ margin: 0 }}>
          Unable to load survey data: {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="survey-graph-container">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {isLoading && (
        <div 
          className="survey-graph-loading"
          style={{
            padding: '3rem',
            textAlign: 'center',
          }}
        >
          <div 
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid var(--border-dull, #ddd)',
              borderTop: '4px solid var(--primary-color, #007bff)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <p style={{ 
            marginTop: '1rem', 
            color: 'var(--text-light, #666)',
            margin: '1rem 0 0 0'
          }}>
            {isThemeChanging ? 'Updating theme...' : 'Loading survey data...'}
          </p>
        </div>
      )}
      
      <div style={{
        width: '100%',
        height: '600px',
        minHeight: '600px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        background: 'var(--card-background, #f8f9fa)'
      }}>
        <iframe
          ref={iframeRef}
          title={`Metaculus Survey: ${metaculus_title}`}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '600px',
            border: 'none',
            borderRadius: '8px',
            display: isLoading ? 'none' : 'block',
            background: 'transparent'
          }}
          loading="lazy"
        />
      </div>
    </div>
  );
}