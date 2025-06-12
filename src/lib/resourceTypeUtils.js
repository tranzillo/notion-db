// src/lib/resourceTypeUtils.js

/**
 * Creates a slug for a resource type (for CSS class name use)
 * @param {string} resourceType - The resource type name
 * @returns {string} - The slugified name for use in CSS classes
 */
export function createResourceTypeSlug(resourceType) {
    if (!resourceType) return 'unknown';
    
    return resourceType
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }
  
  /**
   * Get CSS class for a resource type
   * @param {string} resourceType - The resource type name
   * @returns {string} - CSS class name for the resource type
   */
  export function getResourceTypeColorClass(resourceType) {
    if (!resourceType) return '';
    
    // Create a slug-based class name
    const slug = createResourceTypeSlug(resourceType);
    return `resource-type-gradient-${slug}`;
  }
  
  /**
   * Safe function to load resource type color data
   * @returns {Promise<Object>} - Resource type color data
   */
  export async function getResourceTypeColorData() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return { resourceTypeColorMap: {}, enhancedResourceTypes: [] };
    }
    
    // Check if data is already loaded in global scope
    if (window.resourceTypeColorMap) {
      return {
        resourceTypeColorMap: window.resourceTypeColorMap,
        enhancedResourceTypes: window.enhancedResourceTypes || []
      };
    }
    
    // Try to load data from the generated module
    try {
      let module = {};
      
      try {
        module = await import('./generated/resourceTypeColorData.js');
      } catch (importError) {
        console.warn('Resource type color data module not found, using fallback data');
        module = { 
          resourceTypeColorMap: {}, 
          enhancedResourceTypes: [] 
        };
      }
      
      // Store in global scope for future access
      window.resourceTypeColorMap = module.resourceTypeColorMap || {};
      window.enhancedResourceTypes = module.enhancedResourceTypes || [];
      
      return {
        resourceTypeColorMap: window.resourceTypeColorMap,
        enhancedResourceTypes: window.enhancedResourceTypes
      };
    } catch (error) {
      console.warn('Error loading resource type color data:', error);
      return { resourceTypeColorMap: {}, enhancedResourceTypes: [] };
    }
  }
  
  /**
   * Load resource type colors CSS file - called at runtime
   */
  export function loadResourceTypeColorsCss() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    // Add the stylesheet link if it doesn't exist yet
    if (!document.getElementById('resource-type-color-styles')) {
      const link = document.createElement('link');
      link.id = 'resource-type-color-styles';
      link.rel = 'stylesheet';
      link.href = '/styles/generated/resource-type-colors.css';
      document.head.appendChild(link);
    }
  }
  
  /**
   * Initialize resource types - this is the main function to call
   * from client-side code to set everything up
   */
  export function initResourceTypeColorMap() {
    if (typeof window === 'undefined') return;
    
    console.log('Initializing resource type colors');
    
    // Load CSS first
    loadResourceTypeColorsCss();
    
    // Then load color data
    getResourceTypeColorData()
      .then(() => {
        // Apply to any existing elements
        applyResourceTypeColors();
      })
      .catch(error => {
        console.warn('Error initializing resource type colors:', error);
      });
  }
  
  // Alias for backward compatibility
  export const initResourceTypes = initResourceTypeColorMap;
  
  /**
   * Apply resource type color classes to elements after the page loads
   */
  export function applyResourceTypeColors() {
    // Only run in the browser environment
    if (typeof window === 'undefined') return;
    
    try {
      console.log('Applying resource type colors to elements');
      
      // Find all resource type elements
      const resourceTypeElements = document.querySelectorAll(
        '.capability-card__resource-type, .capability-detail__resource-type, .bottleneck-detail__resource-type'
      );
      
      console.log(`Found ${resourceTypeElements.length} resource type elements`);
      
      // Apply color classes based on content
      resourceTypeElements.forEach(element => {
        // Get the resource type from the text content
        // Remove any trailing commas that might be part of the display format
        const resourceType = element.textContent.trim().replace(/,\s*$/, '');
        
        if (!resourceType) return;
        
        // Calculate the class name
        const slug = createResourceTypeSlug(resourceType);
        const className = `resource-type-gradient-${slug}`;
        
        console.log(`Applying class ${className} to element with text "${resourceType}"`);
        
        // Add the class if it doesn't already have it
        if (!element.className.includes(className)) {
          element.classList.add(className);
        }
      });
    } catch (error) {
      console.error('Error applying resource type colors:', error);
    }
  }
  
  // Add a method to debug current resource type configuration
  export function debugResourceTypes() {
    if (typeof window === 'undefined') return;
    
    getResourceTypeColorData().then(data => {
      console.log('Resource Type Color Map:', data.resourceTypeColorMap);
      console.log('Enhanced Resource Types:', data.enhancedResourceTypes);
      
      // Find all elements with resource type classes
      const elements = document.querySelectorAll('[class*="resource-type-gradient-"]');
      console.log(`Found ${elements.length} elements with resource type classes`);
      
      // Check which resource types are actually being used
      const usedClasses = new Set();
      elements.forEach(el => {
        Array.from(el.classList).forEach(className => {
          if (className.startsWith('resource-type-gradient-')) {
            usedClasses.add(className);
          }
        });
      });
      
      console.log('Used resource type classes:', Array.from(usedClasses));
      
      // Check for potentially missing styles
      const definedTypes = Object.values(data.resourceTypeColorMap || {})
        .map(slug => `resource-type-gradient-${slug}`);
      
      console.log('Defined resource type classes:', definedTypes);
      
      // Find classes that are used but not defined
      const missingStyles = Array.from(usedClasses)
        .filter(className => !definedTypes.includes(className));
      
      if (missingStyles.length > 0) {
        console.warn('Resource type classes used but not defined:', missingStyles);
      }
    });
  }
  
  export default {
    createResourceTypeSlug,
    getResourceTypeColorClass,
    getResourceTypeColorData,
    loadResourceTypeColorsCss,
    initResourceTypeColorMap,
    initResourceTypes,
    applyResourceTypeColors,
    debugResourceTypes
  };