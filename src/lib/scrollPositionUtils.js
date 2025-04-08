// src/lib/scrollPositionUtils.js

/**
 * Save the current scroll position and the ID of the clicked bottleneck
 * @param {string} itemId - ID of the bottleneck or capability that was clicked
 * @param {string} itemSlug - Slug of the item that was clicked
 * @param {string} sourcePath - The current path where scrolling is being saved from
 */
export function saveScrollPosition(itemId, itemSlug, sourcePath) {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Automatically determine the source path if not provided
    if (!sourcePath && typeof window !== 'undefined') {
      sourcePath = window.location.pathname;
    }
    
    // Only save position for dashboard pages
    if (!isDashboardPath(sourcePath)) {
      return;
    }
    
    // Save both the scroll position and the item ID
    const scrollData = {
      scrollY: window.scrollY,
      itemId: itemId,
      itemSlug: itemSlug,
      sourcePath: sourcePath,
      timestamp: Date.now() // Add timestamp to handle stale data
    };
    
    sessionStorage.setItem('dashboardScrollPosition', JSON.stringify(scrollData));
  } catch (e) {
    console.error('Error saving scroll position:', e);
  }
}

/**
 * Get the saved scroll position and item ID
 * @returns {Object|null} Object with scrollY and itemId, or null if not found
 */
export function getSavedScrollPosition() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const scrollData = sessionStorage.getItem('dashboardScrollPosition');
    if (!scrollData) {
      return null;
    }
    
    const parsedData = JSON.parse(scrollData);
    
    // Check if data is stale (older than 30 minutes)
    const isStale = Date.now() - parsedData.timestamp > 30 * 60 * 1000;
    if (isStale) {
      sessionStorage.removeItem('dashboardScrollPosition');
      return null;
    }
    
    return parsedData;
  } catch (e) {
    console.error('Error retrieving scroll position:', e);
    return null;
  }
}

/**
 * Check if the given path is a dashboard path
 * @param {string} path - Path to check
 * @returns {boolean} - True if path is a dashboard path
 */
export function isDashboardPath(path) {
  return path === '/' || 
         path === '' || 
         path === '/gaps' || 
         path === '/capabilities';
}

/**
 * Clear the saved scroll position
 */
export function clearScrollPosition() {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    sessionStorage.removeItem('dashboardScrollPosition');
  } catch (e) {
    console.error('Error clearing scroll position:', e);
  }
}

/**
 * Check if current navigation is a "back" navigation to a dashboard
 * @returns {boolean} - True if navigating back to a dashboard
 */
export function isBackNavigationToDashboard() {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    // Check if we're on a dashboard page
    const currentPath = window.location.pathname;
    if (!isDashboardPath(currentPath)) {
      return false;
    }
    
    // Get saved position data
    const scrollData = getSavedScrollPosition();
    if (!scrollData) {
      return false;
    }
    
    // Make sure we're returning to the same dashboard path
    return scrollData.sourcePath === currentPath;
  } catch (e) {
    console.error('Error checking navigation type:', e);
    return false;
  }
}

/**
 * Attempt to scroll to the saved position or to the specific item card
 * @param {Array} visibleItems - Array of currently visible items
 */
export function scrollToSavedPosition(visibleItems = []) {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Only proceed if this is a back navigation to a dashboard
    if (!isBackNavigationToDashboard()) {
      return;
    }
    
    const scrollData = getSavedScrollPosition();
    if (!scrollData) {
      return;
    }
    
    // Define a function to scroll to the element
    const scrollToElement = (elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        // Scroll the element into view with a little offset
        element.scrollIntoView({ behavior: 'auto', block: 'center' });
        return true;
      }
      return false;
    };
    
    // Option 1: Check if the previously viewed item is in the current filtered results
    if (scrollData.itemId && visibleItems.some(item => item.id === scrollData.itemId)) {
      // Try to find and scroll to the card
      const cardType = window.location.pathname.includes('capabilities') ? 'capability' : 'bottleneck';
      const success = scrollToElement(`${cardType}-card-${scrollData.itemId}`);
      if (success) {
        // Clear the saved position as we've now used it
        clearScrollPosition();
        return;
      }
    }
    
    // Option 2: Fall back to the saved Y position if we couldn't find the card
    if (scrollData.scrollY !== undefined) {
      window.scrollTo({
        top: scrollData.scrollY,
        behavior: 'auto'
      });
    }
    
    // Clear the saved position as we've now used it
    clearScrollPosition();
  } catch (e) {
    console.error('Error restoring scroll position:', e);
  }
}