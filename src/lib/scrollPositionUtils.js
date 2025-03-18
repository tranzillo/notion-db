// src/lib/scrollPositionUtils.js

/**
 * Save the current scroll position and the ID of the clicked bottleneck
 * @param {string} bottleneckId - ID of the bottleneck that was clicked
 * @param {string} bottleneckSlug - Slug of the bottleneck that was clicked
 */
export function saveScrollPosition(bottleneckId, bottleneckSlug) {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Save both the scroll position and the bottleneck ID
      const scrollData = {
        scrollY: window.scrollY,
        bottleneckId: bottleneckId,
        bottleneckSlug: bottleneckSlug,
        timestamp: Date.now() // Add timestamp to handle stale data
      };
      
      sessionStorage.setItem('dashboardScrollPosition', JSON.stringify(scrollData));
    } catch (e) {
      console.error('Error saving scroll position:', e);
    }
  }
  
  /**
   * Get the saved scroll position and bottleneck ID
   * @returns {Object|null} Object with scrollY and bottleneckId, or null if not found
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
   * Attempt to scroll to the saved position or to the specific bottleneck card
   * @param {Array} visibleBottlenecks - Array of currently visible bottlenecks
   */
  export function scrollToSavedPosition(visibleBottlenecks = []) {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
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
      
      // Option 1: Check if the previously viewed bottleneck is in the current filtered results
      if (scrollData.bottleneckId && visibleBottlenecks.some(b => b.id === scrollData.bottleneckId)) {
        // Try to find and scroll to the card
        const success = scrollToElement(`bottleneck-card-${scrollData.bottleneckId}`);
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