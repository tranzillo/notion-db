// src/lib/enhancedData.js

import { getAllData } from './notion';
import { extractFields } from './dataUtils'; // Updated function name
import { getAllContentAreas } from './contentUtils';

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
  
  // Extract fields without colors
  const fieldsWithoutColors = extractFields(originalBottlenecks);
  
  // Enhance fields with pre-generated colors
  const fields = fieldsWithoutColors.map(enhanceField);
  
  // Add color information to bottlenecks' fields
  const bottlenecks = originalBottlenecks.map(bottleneck => {
    if (bottleneck.field && bottleneck.field.id) {
      const enhancedField = fields.find(d => d.id === bottleneck.field.id);
      if (enhancedField) {
        return {
          ...bottleneck,
          field: enhancedField
        };
      }
    }
    return bottleneck;
  });
  
  // Create foundational capabilities with associated bottlenecks (but avoid circular references)
  const foundationalCapabilities = originalFCs.map(fc => {
    // Generate slug if needed
    const slug = fc.slug || fc.fc_name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    // Find associated bottlenecks from the enhanced bottlenecks array
    const associatedBottlenecks = bottlenecks
      .filter(bottleneck => bottleneck.foundational_capabilities.some(c => c.id === fc.id))
      .map(bottleneck => ({
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
      }));
    
    return {
      ...fc,
      slug,
      bottlenecks: associatedBottlenecks
    };
  });
  
  // Get content from static Notion pages
  const contentAreas = await getAllContentAreas();
  
  return {
    bottlenecks,
    foundationalCapabilities,
    resources,
    fields,
    resourceTypeOptions,
    contentAreas
  };
}