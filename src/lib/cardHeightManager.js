// src/lib/cardHeightManager.js

/**
 * Utility for managing consistent card heights in grid layouts
 * With improved tracking of filtered cards
 */
const cardHeightManager = {
  // Flag to prevent recursive calculations
  isCalculating: false,
  
  // Store the observer
  observer: null,
  
  // Store cards currently being expanded by user
  expandedCards: new Set(),
  
  // Initialize height management
  initializeCardHeights(selector, containerSelector = '.bottleneck-grid') {
    // Initial calculation
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupHeightManagement(selector, containerSelector);
      });
    } else {
      this.setupHeightManagement(selector, containerSelector);
    }
  },
  
  // Setup all height management functionality
  setupHeightManagement(selector, containerSelector) {
    // Initial height calculation
    this.recalculateHeights(selector, containerSelector);
    
    // Setup window resize listener
    window.addEventListener('resize', this.debounce(() => {
      if (this.shouldProcessGridView()) {
        this.recalculateHeights(selector, containerSelector);
      }
    }, 250));
    
    // Setup view change listener
    window.addEventListener('view-changed', this.debounce(() => {
      if (this.shouldProcessGridView()) {
        setTimeout(() => {
          this.recalculateHeights(selector, containerSelector);
        }, 50);
      }
    }, 100));
    
    // IMPORTANT: Listen for ALL filter events that might cause cards to enter/exit the DOM
    const filterEvents = [
      'fields-changed', 
      'search-changed', 
      'tag-changed', 
      'private-tag-changed', 
      'sort-changed'
    ];
    
    filterEvents.forEach(eventName => {
      window.addEventListener(eventName, this.debounce(() => {
        if (this.shouldProcessGridView()) {
          // Clean up expanded cards set when filters change
          this.syncExpandedCardsWithDOM(selector, containerSelector);
          
          // Then recalculate heights after a delay for DOM updates
          setTimeout(() => {
            this.recalculateHeights(selector, containerSelector);
          }, 100);
        }
      }, 50));
    });
    
    // Also setup mutation observer as a safety net
    this.setupMutationObserver(selector, containerSelector);
  },
  
  // NEW METHOD: Synchronize expandedCards with what's actually in the DOM
  syncExpandedCardsWithDOM(selector, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Get all card IDs currently in the DOM
    const currentCardIds = new Set(
      Array.from(container.querySelectorAll(selector))
        .filter(card => card.id)
        .map(card => card.id)
    );
    
    // Remove IDs from expandedCards that aren't in the DOM anymore
    const cardsToRemove = [];
    this.expandedCards.forEach(cardId => {
      if (!currentCardIds.has(cardId)) {
        cardsToRemove.push(cardId);
      }
    });
    
    cardsToRemove.forEach(cardId => {
      this.expandedCards.delete(cardId);
    });
    
    if (cardsToRemove.length > 0) {
      console.log(`Cleaned up ${cardsToRemove.length} expanded cards that were filtered out`);
    }
  },
  
  // Check if we should process (only in grid view)
  shouldProcessGridView() {
    return document.documentElement.dataset.listView !== 'true' && 
           document.documentElement.dataset.graphView !== 'true';
  },
  
  // Set up minimal mutation observer as safety net
  setupMutationObserver(selector, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Clean up any existing observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Create handler function
    const handleMutation = this.debounce((mutations) => {
      if (this.shouldProcessGridView() && !this.isCalculating) {
        // Check for card removals specifically
        const hasCardRemoval = mutations.some(mutation => 
          mutation.type === 'childList' && mutation.removedNodes.length > 0
        );
        
        if (hasCardRemoval) {
          // Sync with DOM first if cards were removed
          this.syncExpandedCardsWithDOM(selector, containerSelector);
        }
        
        this.recalculateHeights(selector, containerSelector);
      }
    }, 100);
    
    // Create a new observer
    this.observer = new MutationObserver(mutations => {
      // Check if mutations include card changes
      const hasCardChanges = mutations.some(mutation => {
        if (mutation.type !== 'childList') return false;
        
        // Check if added nodes contain cards or if nodes were removed
        const hasRelevantAddedNodes = Array.from(mutation.addedNodes)
          .filter(node => node.nodeType === Node.ELEMENT_NODE)
          .some(node => {
            return node.matches && 
                  (node.matches(selector) || 
                   (node.querySelectorAll && node.querySelectorAll(selector).length > 0));
          });
        
        return hasRelevantAddedNodes || mutation.removedNodes.length > 0;
      });
      
      if (hasCardChanges) {
        handleMutation(mutations);
      }
    });
    
    // Start observing
    this.observer.observe(container, {
      childList: true,
      subtree: true
    });
  },
  
  // Main function to calculate and set heights - accurate measurement approach
  recalculateHeights(selector, containerSelector) {
    // Prevent recursive calculation
    if (this.isCalculating) return;
    this.isCalculating = true;
    
    try {
      const container = document.querySelector(containerSelector);
      if (!container) {
        this.isCalculating = false;
        return;
      }
      
      // IMPORTANT: Sync with DOM before doing any calculations
      this.syncExpandedCardsWithDOM(selector, containerSelector);
      
      const cards = container.querySelectorAll(selector);
      if (!cards.length) {
        this.isCalculating = false;
        return;
      }
      
      // First, preserve ALL current style attributes so we can restore them exactly
      const cardStyles = new Map();
      cards.forEach(card => {
        if (!card.id) return;
        cardStyles.set(card.id, {
          maxHeight: card.style.maxHeight,
          height: card.style.height,
          overflow: card.style.overflow
        });
      });
      
      // Save expansion state for each card
      const expandedCards = new Set();
      cards.forEach(card => {
        if (card.id && this.expandedCards.has(card.id)) {
          expandedCards.add(card.id);
        }
      });
      
      // Function to find all expanded content sections in a card
      const findExpandedSections = (card) => {
        return Array.from(card.querySelectorAll(
          '.bottleneck-card__capabilities-expanded, ' +
          '.capability-card__bottlenecks-expanded, ' +
          '.resource-card__capabilities-expanded'
        ));
      };
      
      // Temporarily hide expanded sections from DOM but track their visibility
      const sectionVisibility = new Map();
      cards.forEach(card => {
        if (!card.id) return;
        
        // Only process expanded cards
        if (expandedCards.has(card.id)) {
          findExpandedSections(card).forEach(section => {
            const isVisible = window.getComputedStyle(section).display !== 'none';
            if (isVisible) {
              sectionVisibility.set(section, section.style.display || 'block');
              section.style.display = 'none';
            }
          });
        }
      });
      
      // Temporarily set all cards to be measured with consistent style
      // but without changing height to prevent layout shift
      cards.forEach(card => {
        if (!card.id) return;
        
        // Set a very large maxHeight to avoid constraints while measuring
        card.style.maxHeight = '9999px';
        // Set overflow to hidden to prevent expanded cards from affecting layout
        card.style.overflow = 'hidden';
        // Keep height at 100% for consistent measurement
        card.style.height = '100%';
      });
      
      // Force reflow
      container.offsetHeight;
      
      // Group by row position
      const rowGroups = this.groupCardsByRow(Array.from(cards));
      
      // Calculate max heights by row
      const rowMaxHeights = new Map();
      rowGroups.forEach((rowCards, rowIndex) => {
        // Measure the natural content height of each card
        const heights = rowCards.map(card => {
          // We need the content height, not the element height
          const contentHeight = this.getContentHeight(card);
          return contentHeight;
        });
        
        // Get max height in this row
        const maxHeight = Math.max(...heights);
        rowMaxHeights.set(rowIndex, maxHeight);
      });
      
      // Apply the max heights based on row position
      rowGroups.forEach((rowCards, rowIndex) => {
        const maxHeight = rowMaxHeights.get(rowIndex);
        rowCards.forEach(card => {
          if (!card.id) return;
          
          if (expandedCards.has(card.id)) {
            // Expanded cards: Remove constraints
            card.style.maxHeight = 'none';
            card.style.height = 'auto';
            card.style.overflow = ''; // Restore default overflow
          } else {
            // Non-expanded cards: Set consistent height
            card.style.maxHeight = `${maxHeight}px`;
            card.style.height = '100%';
            card.style.overflow = ''; // Restore default overflow
          }
        });
      });
      
      // Restore expanded sections visibility
      sectionVisibility.forEach((displayValue, section) => {
        section.style.display = displayValue;
      });
      
    } catch (error) {
      console.error('Error recalculating card heights:', error);
    } finally {
      this.isCalculating = false;
    }
  },
  
  // Helper function to get content height accounting for padding, borders, etc.
  getContentHeight(element) {
    // Create a temporary wrapper to measure full content height
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.visibility = 'hidden';
    wrapper.style.height = 'auto';
    wrapper.style.width = `${element.offsetWidth}px`; // Match the width
    
    // Clone the element's contents without expanded sections
    const clone = element.cloneNode(true);
    
    // Remove any expanded sections from the clone
    const expandedSections = clone.querySelectorAll(
      '.bottleneck-card__capabilities-expanded, ' +
      '.capability-card__bottlenecks-expanded, ' +
      '.resource-card__capabilities-expanded'
    );
    expandedSections.forEach(section => section.remove());
    
    // Add the clone to our wrapper
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    
    // Get the height
    const height = clone.offsetHeight;
    
    // Clean up
    document.body.removeChild(wrapper);
    
    return height;
  },
  
  // Group cards by row
  groupCardsByRow(cards) {
    const rowGroups = [];
    const tolerance = 5; // Pixel tolerance for row detection
    
    // Get card positions
    const positions = cards.map(card => ({
      card,
      top: card.getBoundingClientRect().top
    }));
    
    // Sort by vertical position
    positions.sort((a, b) => a.top - b.top);
    
    // Group into rows
    let currentRow = [];
    let currentRowTop = null;
    
    positions.forEach(({ card, top }) => {
      if (currentRowTop === null || Math.abs(top - currentRowTop) <= tolerance) {
        if (currentRowTop === null) currentRowTop = top;
        currentRow.push(card);
      } else {
        if (currentRow.length > 0) {
          rowGroups.push(currentRow);
        }
        currentRow = [card];
        currentRowTop = top;
      }
    });
    
    // Add the final row
    if (currentRow.length > 0) {
      rowGroups.push(currentRow);
    }
    
    return rowGroups;
  },
  
  // Handle user expanding a card
  expandCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    // Track this card as expanded
    this.expandedCards.add(cardId);
    
    // Remove height constraints
    card.style.maxHeight = 'none';
    card.style.height = 'auto';
  },
  
  // Handle user collapsing a card
  collapseCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    // Remove from expanded tracking
    this.expandedCards.delete(cardId);
    
    // Force recalculation of row heights
    const selector = 
      card.classList.contains('bottleneck-card') ? '.bottleneck-card' :
      card.classList.contains('capability-card') ? '.capability-card' : 
      '.resource-card';
    
    const containerSelector = '.bottleneck-grid';
    
    // Recalculate with small delay to allow DOM updates
    setTimeout(() => {
      this.recalculateHeights(selector, containerSelector);
    }, 50);
  },
  
  // Reset all tracked expanded states - good for full page resets
  resetExpandedCards() {
    this.expandedCards.clear();
  },
  
  // Cleanup resources
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.expandedCards.clear();
  },
  
  // Utility debounce function
  debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
};

export default cardHeightManager;