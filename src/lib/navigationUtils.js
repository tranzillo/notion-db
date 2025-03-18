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
      // Get the current search params
      const searchParams = window.location.search;
      
      // Save if there are parameters OR if we're explicitly forcing an empty state
      if (searchParams || forceEmpty) {
        sessionStorage.setItem('lastDashboardState', searchParams);
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
      return sessionStorage.getItem('lastDashboardState') || '';
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