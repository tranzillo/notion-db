// src/lib/enhancedData.js
import { getAllData } from './notion';
import { extractFields } from './dataUtils';
import { getAllContentAreas } from './contentUtils';
import { createCapabilitySlug, createBottleneckSlug } from './slugUtils';
import { 
  debugBottleneck, 
  debugCapability, 
  debugDataState,
  checkForCircularReferences
} from './debuggingUtils';

// Import pre-generated field color data
let enhancedFields = [];

try {
  // This module is created at build time
  const fieldColorData = import.meta.glob('./generated/fieldColorData.js', { eager: true });
  if (fieldColorData['./generated/fieldColorData.js']) {
    enhancedFields = fieldColorData['./generated/fieldColorData.js'].enhancedFields;
  }
} catch (error) {
  console.error('Error loading pre-generated field colors', error);
  // Continue with empty array
}

/**
 * Match a field with its enhanced color data
 * @param {Object} field - Original field object
 * @returns {Object} - Field with color data
 */
function enhanceField(field) {
  if (!field || !field.id) return field;
  
  const enhancedField = enhancedFields.find(d => d.id === field.id);
  
  if (enhancedField) {
    return {
      ...field,
      colorName: enhancedField.colorName,
      colorClass: enhancedField.colorClass
    };
  }
  
  // If no pre-generated color is found, assign a default color class
  const colorId = Math.abs(field.id.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0) % 8);
  
  return {
    ...field,
    colorName: `gradient-${colorId}`,
    colorClass: `field-gradient-${colorId}`
  };
}

/**
 * Get all data from Notion and enhance it with pre-generated color information
 * @returns {Object} Enhanced data
 */
export async function getEnhancedData() {
  // Fetch raw data from Notion
  const { 
    bottlenecks: originalBottlenecks,
    foundationalCapabilities: originalFCs,
    resources,
    resourceTypeOptions
  } = await getAllData();
  
  console.log(`DEBUG: Received ${originalBottlenecks.length} bottlenecks and ${originalFCs.length} capabilities from Notion`);
  
  // Debug data state after initial fetch
  debugDataState(originalBottlenecks, originalFCs, "after-notion-fetch");
  
  // Debug problematic bottlenecks
  originalBottlenecks
    .filter(b => b.bottleneck_number >= 1 && b.bottleneck_number <= 4)
    .forEach(b => debugBottleneck(b, "raw-from-notion"));
  
  // Extract fields without colors
  const fieldsWithoutColors = extractFields(originalBottlenecks);
  console.log(`DEBUG: Extracted ${fieldsWithoutColors.length} unique fields`);
  
  // Enhance fields with pre-generated colors
  const fields = fieldsWithoutColors.map(enhanceField);
  
  // Add color information to bottlenecks' fields and ensure valid slugs
  const bottlenecks = originalBottlenecks.map(bottleneck => {
    try {
      // Generate a fresh slug for every bottleneck to ensure consistency
      const originalName = bottleneck.bottleneck_name || '';
      const newSlug = createBottleneckSlug(originalName);
      
      // Log any slug changes for debugging
      if (bottleneck.slug && bottleneck.slug !== newSlug) {
        console.log(`DEBUG: Slug changed for bottleneck ${bottleneck.id}:`);
        console.log(`  Original: "${bottleneck.slug}"`);
        console.log(`  New:      "${newSlug}"`);
        console.log(`  Name:     "${originalName}"`);
      }
      
      // Create a new object instead of mutating the original
      let enhancedBottleneck = {
        ...bottleneck,
        slug: newSlug 
      };
      
      // Update field with enhanced field data
      if (bottleneck.field && bottleneck.field.id) {
        const enhancedField = fields.find(d => d.id === bottleneck.field.id);
        if (enhancedField) {
          enhancedBottleneck.field = enhancedField;
        }
      }
      
      // Debug specific bottlenecks (1-4)
      if (bottleneck.bottleneck_number >= 1 && bottleneck.bottleneck_number <= 4) {
        debugBottleneck(enhancedBottleneck, "after-enhancement");
      }
      
      return enhancedBottleneck;
    } catch (error) {
      console.error(`ERROR enhancing bottleneck "${bottleneck.bottleneck_name}" (${bottleneck.id}):`, error);
      // Return the original bottleneck as a fallback
      return bottleneck;
    }
  });
  
  console.log(`DEBUG: Enhanced ${bottlenecks.length} bottlenecks`);
  
  // Create foundational capabilities with associated bottlenecks and ensure valid slugs
  const foundationalCapabilities = originalFCs.map(fc => {
    try {
      // Generate a fresh slug for every capability
      const originalName = fc.fc_name || '';
      const newSlug = createCapabilitySlug(originalName);
      
      // Log any slug changes for debugging
      if (fc.slug && fc.slug !== newSlug) {
        console.log(`DEBUG: Slug changed for capability ${fc.id}:`);
        console.log(`  Original: "${fc.slug}"`);
        console.log(`  New:      "${newSlug}"`);
        console.log(`  Name:     "${originalName}"`);
      }
      
      // Find associated bottlenecks from the enhanced bottlenecks array
      const associatedBottlenecks = bottlenecks
        .filter(bottleneck => {
          // Check if this bottleneck references this FC
          const hasReference = bottleneck.foundational_capabilities &&
            bottleneck.foundational_capabilities.some(c => c && c.id === fc.id);
          
          return hasReference;
        })
        .map(bottleneck => {
          // Create a simplified bottleneck object to avoid circular references
          return {
            id: bottleneck.id,
            bottleneck_name: bottleneck.bottleneck_name,
            bottleneck_description: bottleneck.bottleneck_description,
            slug: bottleneck.slug,
            field: bottleneck.field, // This has the colorClass from above
            bottleneck_rank: bottleneck.bottleneck_rank,
            bottleneck_number: bottleneck.bottleneck_number,
            tags: bottleneck.tags,
            privateTags: bottleneck.privateTags
            // No foundational_capabilities array to avoid circular references
          };
        });
      
      const enhancedFC = {
        ...fc,
        slug: newSlug,
        bottlenecks: associatedBottlenecks
      };
      
      // Debug capabilities with few or no associated bottlenecks
      if (associatedBottlenecks.length <= 1) {
        debugCapability(enhancedFC, "few-bottlenecks");
      }
      
      // Debug capabilities from the working field
      const hasWorkingField = associatedBottlenecks.some(b => 
        b.field && b.field.field_name && 
        b.field.field_name.includes("Physiology and Medicine")
      );
      
      if (hasWorkingField) {
        debugCapability(enhancedFC, "working-field");
      }
      
      return enhancedFC;
    } catch (error) {
      console.error(`ERROR enhancing capability "${fc.fc_name}" (${fc.id}):`, error);
      // Return the original FC with a basic slug as fallback
      return {
        ...fc,
        slug: fc.slug || createCapabilitySlug(fc.fc_name || 'untitled'),
        bottlenecks: []
      };
    }
  });
  
  console.log(`DEBUG: Enhanced ${foundationalCapabilities.length} capabilities`);
  
  // Debug data state after enhancement
  debugDataState(bottlenecks, foundationalCapabilities, "after-enhancement");
  
  // Get content from static Notion pages
  const contentAreas = await getAllContentAreas();
  
  // Check for circular references
  const result = {
    bottlenecks,
    foundationalCapabilities,
    resources,
    fields,
    resourceTypeOptions,
    contentAreas
  };
  
  // Debug check for circular references
  console.log("Checking for circular references in bottlenecks...");
  bottlenecks.forEach(b => {
    if (checkForCircularReferences(b)) {
      console.log(`Found circular reference in bottleneck: ${b.bottleneck_name} (${b.id})`);
    }
  });
  
  console.log("Checking for circular references in capabilities...");
  foundationalCapabilities.forEach(fc => {
    if (checkForCircularReferences(fc)) {
      console.log(`Found circular reference in capability: ${fc.fc_name} (${fc.id})`);
    }
  });
  
  return result;
}