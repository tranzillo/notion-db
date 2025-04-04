/**
 * Clear the saved URL state
 */
export function clearSavedUrlState() {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      sessionStorage.removeItem('lastDashboardState');
    } catch (e) {
      console.error('Error clearing URL state from session storage:', e);
    }
  }// src/lib/navigationUtils.js
  
  /**
   * Save current URL query parameters to sessionStorage
   * This allows us to restore filters when navigating back to the dashboard
   * @param {boolean} forceEmpty - If true, will force save an empty state even if there are no parameters
   */
  export function saveCurrentUrlState(forceEmpty = false) {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Get the current path and search params
      const currentPath = window.location.pathname;
      const searchParams = window.location.search;
      
      // Determine which state key to use based on the current path
      const stateKey = currentPath.startsWith('/capabilities') 
        ? 'lastCapabilitiesState' 
        : 'lastDashboardState';
      
      // Save if there are parameters OR if we're explicitly forcing an empty state
      if (searchParams || forceEmpty) {
        sessionStorage.setItem(stateKey, searchParams);
      }
    } catch (e) {
      console.error('Error saving URL state to session storage:', e);
    }
  }
  
  /**
   * Get the previously saved URL parameters
   * @returns {string} URL search parameters string (including the '?')
   */
  export function getSavedUrlState() {
    if (typeof window === 'undefined') {
      return '';
    }
    
    try {
      // Determine which state key to use based on the current path
      const currentPath = window.location.pathname;
      const stateKey = currentPath.startsWith('/capabilities') 
        ? 'lastCapabilitiesState' 
        : 'lastDashboardState';
      
      return sessionStorage.getItem(stateKey) || '';
    } catch (e) {
      console.error('Error retrieving URL state from session storage:', e);
      return '';
    }
  }
  
  /**
   * Navigate back to the dashboard, preserving filters
   * @param {Event} e - Click event (optional)
   */
  export function navigateBackToDashboard(e) {
    if (e) {
      e.preventDefault();
    }
    
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Check if we can use history.back()
      const savedState = getSavedUrlState();
      
      // If we have saved state, navigate to root with those params
      if (savedState) {
        window.location.href = `/${savedState}`;
      } 
      // If there's an entry in history, use that
      else if (window.history.length > 1) {
        window.history.back();
      } 
      // Fallback to simple root navigation
      else {
        window.location.href = '/';
      }
    } catch (e) {
      console.error('Error during navigation:', e);
      // Fallback to simple navigation
      window.location.href = '/';
    }
  }

  export function setupScrollRestoration() {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Store current scroll position when navigating
    window.addEventListener('popstate', (event) => {
      if (event.state && typeof event.state.scrollPosition === 'number') {
        // Restore scroll position after a short delay to ensure DOM is updated
        setTimeout(() => {
          window.scrollTo(0, event.state.scrollPosition);
        }, 10);
      }
    });
    
    // Save initial state with scroll position
    if (!window.history.state || window.history.state.scrollPosition === undefined) {
      window.history.replaceState({
        scrollPosition: window.scrollY
      }, '');
    }
  }
  /**
 * Update URL parameters, deciding whether to create a history entry based on context
 * @param {Object} paramsObject - Key-value pairs of parameters to update
 * @param {boolean} forceReplace - If true, always use replaceState even for navigation
 * @returns {string} The new URL
 */
export function updateUrlParams(paramsObject, forceReplace = false) {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const params = new URLSearchParams(window.location.search);
  
  // Update params based on the provided object
  Object.entries(paramsObject).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  
  // Construct the new URL
  const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  
  // This is a filter operation, not navigation - use replaceState
  window.history.replaceState({
    scrollPosition: window.scrollY
  }, '', newUrl);
  
  return newUrl;
}