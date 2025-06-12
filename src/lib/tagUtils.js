// src/lib/tagUtils.js
import { createSlug } from './slugUtils';

/**
 * Extract unique tags from bottlenecks and solutions
 * @param {Array} items - Array of bottleneck or solution objects
 * @returns {Array} - Array of unique tag strings
 */
export function extractTags(items) {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    
    // Create a set to store unique tags
    const tagSet = new Set();
    
    // Add each tag to the set
    items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag) tagSet.add(tag);
        });
      }
    });
    
    // Convert the set to an array and sort alphabetically
    return Array.from(tagSet).sort();
  }
  
  /**
   * Create a slug version of a tag for URL usage
   * @param {string} tag - Original tag string
   * @returns {string} - URL-friendly tag slug
   */
  export function createTagSlug(tag) {
    return createSlug(tag);
  }
  
  /**
   * Extract tag values from URL parameters
   * @param {string} url - URL string or search params string
   * @returns {Object} - Object with tag and privateTag (for) values
   */
  export function getTagsFromUrl(url) {
    if (!url) {
      return { tag: '', privateTag: '' };
    }
    
    const urlObj = new URL(url.startsWith('http') ? url : `http://example.com${url}`);
    const tag = urlObj.searchParams.get('tag') || '';
    const privateTag = urlObj.searchParams.get('for') || '';
    
    return { tag, privateTag };
  }
  
  /**
   * Parse query parameters from URL for server-side use, including tag parameters
   * @param {string} url - URL string
   * @returns {Object} - Object with searchQuery, disciplineSlugs, sortBy, tag, and privateTag
   */
  export function parseUrlParamsWithTags(url) {
    const params = new URLSearchParams(
      url.toString().split('?')[1] || ''
    );
    
    const searchQuery = params.get('q') || '';
    const fieldsParam = params.get('fields') || '';
    const fieldSlugs = fieldsParam ? fieldsParam.split(',') : [];
    const sortBy = params.get('sort') || 'rank'; // Default to rank sort
    const tag = params.get('tag') || '';
    const privateTag = params.get('for') || '';
    
    return {
      searchQuery,
      fieldSlugs,
      sortBy,
      tag,
      privateTag
    };
  }