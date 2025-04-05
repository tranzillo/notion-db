// src/lib/debuggingUtils.js

/**
 * Logs detailed information about a bottleneck for debugging
 * @param {Object} bottleneck - Bottleneck object to inspect
 * @param {string} stage - Which processing stage this is (e.g., "raw", "enhanced")
 */
export function debugBottleneck(bottleneck, stage = "unknown") {
    console.log(`\n==== DEBUG BOTTLENECK [${stage}] ====`);
    console.log(`ID: ${bottleneck.id}`);
    console.log(`Name: "${bottleneck.bottleneck_name}"`);
    console.log(`Slug: "${bottleneck.slug}"`);
    console.log(`Number: ${bottleneck.bottleneck_number}`);
    
    // Check if field exists and log its data
    if (bottleneck.field) {
      console.log(`Field ID: ${bottleneck.field.id}`);
      console.log(`Field Name: "${bottleneck.field?.field_name}"`);
    } else {
      console.log(`Field: MISSING`);
    }
    
    // Check for foundational capabilities
    if (bottleneck.foundational_capabilities) {
      console.log(`FC Count: ${bottleneck.foundational_capabilities.length}`);
      
      // Check for issues in each capability
      bottleneck.foundational_capabilities.forEach((fc, index) => {
        if (!fc.id || !fc.fc_name) {
          console.log(`  ⚠️ FC[${index}] has missing properties!`);
          console.log(`  FC[${index}]:`, fc);
        }
      });
    } else {
      console.log(`FCs: MISSING`);
    }
    
    // Log other properties that might be problematic
    console.log(`Description length: ${(bottleneck.bottleneck_description || '').length}`);
    console.log(`Has Tags: ${bottleneck.tags ? 'Yes' : 'No'}`);
    
    // Try to identify any property that might have unusual characters
    // const props = Object.entries(bottleneck);
    // for (const [key, value] of props) {
    //   if (typeof value === 'string' && /[^\w\s\-\.,]/.test(value)) {
    //     console.log(`⚠️ Property "${key}" contains special characters: "${value}"`);
    //   }
    // }
    
    console.log("=========================\n");
  }
  
  /**
   * Logs detailed information about a capability for debugging
   * @param {Object} capability - Capability object to inspect
   * @param {string} stage - Which processing stage this is
   */
  export function debugCapability(capability, stage = "unknown") {
    console.log(`\n==== DEBUG CAPABILITY [${stage}] ====`);
    console.log(`ID: ${capability.id}`);
    console.log(`Name: "${capability.fc_name}"`);
    console.log(`Slug: "${capability.slug}"`);
    
    // Check if bottlenecks exist and log their data
    if (capability.bottlenecks) {
      console.log(`Bottleneck Count: ${capability.bottlenecks.length}`);
      
      // Check for issues in each bottleneck
      capability.bottlenecks.forEach((bottleneck, index) => {
        if (!bottleneck.id || !bottleneck.bottleneck_name) {
          console.log(`  ⚠️ Bottleneck[${index}] has missing properties!`);
          console.log(`  Bottleneck[${index}]:`, bottleneck);
        }
      });
      
      // Log field distribution
      const fieldCounts = {};
      capability.bottlenecks.forEach(b => {
        if (b.field && b.field.field_name) {
          fieldCounts[b.field.field_name] = (fieldCounts[b.field.field_name] || 0) + 1;
        }
      });
      console.log(`Field distribution:`, fieldCounts);
    } else {
      console.log(`Bottlenecks: MISSING`);
    }
    
    // Log other properties that might be problematic
    console.log(`Description length: ${(capability.fc_description || '').length}`);
    console.log(`Has Tags: ${capability.tags ? 'Yes' : 'No'}`);
    console.log(`Has Resources: ${capability.resources ? 'Yes' : 'No'}`);
    
    // Try to identify any property that might have unusual characters
    // const props = Object.entries(capability);
    // for (const [key, value] of props) {
    //   if (typeof value === 'string' && /[^\w\s\-\.,]/.test(value)) {
    //     console.log(`⚠️ Property "${key}" contains special characters: "${value}"`);
    //   }
    // }
    
    console.log("=========================\n");
  }
  
  /**
   * Insert this at key points in your data loading pipeline
   * to log the state of your data
   * @param {Array} bottlenecks - Array of bottleneck objects
   * @param {Array} capabilities - Array of capability objects
   * @param {string} stage - Identifier for this debug point
   */
  export function debugDataState(bottlenecks, capabilities, stage = "unknown") {
    console.log(`\n\n======= DEBUG DATA STATE [${stage}] =======`);
    
    // Log bottleneck statistics
    console.log(`Bottlenecks count: ${bottlenecks.length}`);
    
    // Count bottlenecks by number
    const numberCounts = {};
    bottlenecks.forEach(b => {
      if (b.bottleneck_number) {
        numberCounts[b.bottleneck_number] = (numberCounts[b.bottleneck_number] || 0) + 1;
      }
    });
    console.log(`Bottlenecks by number:`, numberCounts);
    
    // Check for duplicate bottleneck numbers
    const duplicateNumbers = Object.entries(numberCounts)
      .filter(([_, count]) => count > 1)
      .map(([num]) => num);
    
    if (duplicateNumbers.length > 0) {
      console.log(`⚠️ DUPLICATE BOTTLENECK NUMBERS FOUND: ${duplicateNumbers.join(', ')}`);
      
      // Log the duplicate bottlenecks
      duplicateNumbers.forEach(num => {
        const dupes = bottlenecks.filter(b => b.bottleneck_number === parseInt(num));
        console.log(`Duplicates for number ${num}:`);
        dupes.forEach(d => console.log(`  - ${d.id}: "${d.bottleneck_name}"`));
      });
    }
    
    // Check for duplicate bottleneck slugs
    const slugCounts = {};
    bottlenecks.forEach(b => {
      if (b.slug) {
        slugCounts[b.slug] = (slugCounts[b.slug] || 0) + 1;
      }
    });
    
    const duplicateSlugs = Object.entries(slugCounts)
      .filter(([_, count]) => count > 1)
      .map(([slug]) => slug);
    
    if (duplicateSlugs.length > 0) {
      console.log(`⚠️ DUPLICATE BOTTLENECK SLUGS FOUND: ${duplicateSlugs.join(', ')}`);
      
      // Log the duplicate bottlenecks
      duplicateSlugs.forEach(slug => {
        const dupes = bottlenecks.filter(b => b.slug === slug);
        console.log(`Duplicates for slug "${slug}":`);
        dupes.forEach(d => console.log(`  - ${d.id}: "${d.bottleneck_name}" (Number: ${d.bottleneck_number})`));
      });
    }
    
    // Log capability statistics
    console.log(`Capabilities count: ${capabilities.length}`);
    
    // Check for duplicate capability slugs
    const fcSlugCounts = {};
    capabilities.forEach(fc => {
      if (fc.slug) {
        fcSlugCounts[fc.slug] = (fcSlugCounts[fc.slug] || 0) + 1;
      }
    });
    
    const duplicateFcSlugs = Object.entries(fcSlugCounts)
      .filter(([_, count]) => count > 1)
      .map(([slug]) => slug);
    
    if (duplicateFcSlugs.length > 0) {
      console.log(`⚠️ DUPLICATE CAPABILITY SLUGS FOUND: ${duplicateFcSlugs.join(', ')}`);
      
      // Log the duplicate capabilities
      duplicateFcSlugs.forEach(slug => {
        const dupes = capabilities.filter(fc => fc.slug === slug);
        console.log(`Duplicates for slug "${slug}":`);
        dupes.forEach(d => console.log(`  - ${d.id}: "${d.fc_name}"`));
      });
    }
    
    // Log field statistics for capabilities
    const fcFieldCounts = {};
    capabilities.forEach(fc => {
      if (fc.bottlenecks) {
        fc.bottlenecks.forEach(b => {
          if (b.field && b.field.field_name) {
            fcFieldCounts[b.field.field_name] = (fcFieldCounts[b.field.field_name] || 0) + 1;
          }
        });
      }
    });
    console.log(`Capability references by field:`, fcFieldCounts);
    
    console.log("====================================\n\n");
  }
  
  /**
   * Checks if there are circular references that might cause serialization issues
   * @param {Object} obj - Object to check
   * @param {Set} seen - Set of already seen objects
   * @param {string} path - Current property path
   * @returns {boolean} - Whether circular references were found
   */
  export function checkForCircularReferences(obj, seen = new Set(), path = 'root') {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }
    
    if (seen.has(obj)) {
      console.log(`⚠️ Circular reference detected at: ${path}`);
      return true;
    }
    
    seen.add(obj);
    
    let hasCircular = false;
    
    Object.entries(obj).forEach(([key, value]) => {
      if (value === null || typeof value !== 'object') {
        return;
      }
      
      const newPath = `${path}.${key}`;
      if (checkForCircularReferences(value, new Set(seen), newPath)) {
        console.log(`  - Part of circular reference chain: ${newPath}`);
        hasCircular = true;
      }
    });
    
    return hasCircular;
  }
  
  export default {
    debugBottleneck,
    debugCapability,
    debugDataState,
    checkForCircularReferences
  };