// src/lib/dataUtils.js

/**
 * Extract unique fields from bottlenecks
 * @param {Array} bottlenecks - Array of bottleneck objects
 * @returns {Array} - Array of unique field objects
 */
export function extractFields(bottlenecks) {
  if (!bottlenecks || !Array.isArray(bottlenecks)) {
    return [];
  }
  
  // Create a map to store unique fields by ID
  const fieldMap = new Map();
  
  // Add each field to the map
  bottlenecks.forEach(bottleneck => {
    if (bottleneck.field && bottleneck.field.id) {
      fieldMap.set(bottleneck.field.id, bottleneck.field);
    }
  });
  
  // Convert the map values to an array
  return Array.from(fieldMap.values());
}

/**
 * Extract field IDs from URL parameters
 * @param {string} url - URL string or search params string
 * @param {Array} fields - Array of field objects
 * @returns {Array} - Array of field IDs
 */
export function getFieldIdsFromUrl(url, fields) {
  if (!url || !fields || !fields.length) {
    return [];
  }
  
  const urlObj = new URL(url.startsWith('http') ? url : `http://example.com${url}`);
  const fieldsParam = urlObj.searchParams.get('fields');
  
  if (!fieldsParam) {
    return [];
  }
  
  const fieldSlugs = fieldsParam.split(',');
  
  // Convert slugs to IDs
  return fieldSlugs
    .map(slug => {
      const field = fields.find(d => 
        d.field_name.toLowerCase().replace(/\s+/g, '-') === slug
      );
      return field ? field.id : null;
    })
    .filter(Boolean);
}

/**
 * Parse query parameters from URL for server-side use
 * @param {string} url - URL string
 * @returns {Object} - Object with searchQuery, disciplineSlugs, and sortBy
 */
export function parseUrlParams(url) {
  const params = new URLSearchParams(
    url.toString().split('?')[1] || ''
  );
  
  const searchQuery = params.get('q') || '';
  const disciplinesParam = params.get('disciplines') || '';
  const disciplineSlugs = disciplinesParam ? disciplinesParam.split(',') : [];
  const sortBy = params.get('sort') || 'rank'; // Default to rank sort
  const tag = params.get('tag') || '';
  const privateTag = params.get('for') || '';
  
  return {
    searchQuery,
    disciplineSlugs,
    sortBy,
    tag,
    privateTag
  };
}

/**
 * Update URL parameters without creating a browser history entry
 * @param {Object} paramsObject - Key-value pairs of parameters to update
 */
export function updateUrlParamsWithoutHistory(paramsObject) {
  if (typeof window === 'undefined') {
    return;
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
  
  // Ensure tag and for parameters are mutually exclusive
  if (params.has('tag') && params.has('for')) {
    // Prioritize whatever was just added
    if (paramsObject.tag !== undefined) {
      params.delete('for');
    } else if (paramsObject.for !== undefined) {
      params.delete('tag');
    }
  }
  
  // Construct the new URL
  const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  
  // Use replaceState to update URL without creating a history entry
  window.history.replaceState({}, '', newUrl);
  
  return newUrl;
}