/**
 * Extract unique disciplines from bottlenecks
 * @param {Array} bottlenecks - Array of bottleneck objects
 * @returns {Array} Array of unique discipline objects
 */
export function extractDisciplines(bottlenecks) {
  if (!bottlenecks || !Array.isArray(bottlenecks)) {
    return [];
  }
  
  // Create a map to store unique disciplines by ID
  const disciplineMap = new Map();
  
  // Add each discipline to the map
  bottlenecks.forEach(bottleneck => {
    if (bottleneck.discipline && bottleneck.discipline.id) {
      disciplineMap.set(bottleneck.discipline.id, bottleneck.discipline);
    }
  });
  
  // Convert the map values to an array
  return Array.from(disciplineMap.values());
}

/**
 * Extract discipline IDs from URL parameters
 * @param {string} url - URL string or search params string
 * @param {Array} disciplines - Array of discipline objects
 * @returns {Array} Array of discipline IDs
 */
export function getDisciplineIdsFromUrl(url, disciplines) {
  if (!url || !disciplines || !disciplines.length) {
    return [];
  }
  
  const urlObj = new URL(url.startsWith('http') ? url : `http://example.com${url}`);
  const disciplinesParam = urlObj.searchParams.get('disciplines');
  
  if (!disciplinesParam) {
    return [];
  }
  
  const disciplineSlugs = disciplinesParam.split(',');
  
  // Convert slugs to IDs
  return disciplineSlugs
    .map(slug => {
      const discipline = disciplines.find(d => 
        d.title.toLowerCase().replace(/\s+/g, '-') === slug
      );
      return discipline ? discipline.id : null;
    })
    .filter(Boolean);
}

/**
 * Parse query parameters from URL for server-side use
 * @param {AstroGlobal} Astro - Astro global object
 * @returns {Object} Object with searchQuery and disciplineSlugs
 */
export function parseUrlParams(url) {
  const params = new URLSearchParams(
    url.toString().split('?')[1] || ''
  );
  
  const searchQuery = params.get('q') || '';
  const disciplinesParam = params.get('disciplines') || '';
  const disciplineSlugs = disciplinesParam ? disciplinesParam.split(',') : [];
  
  return {
    searchQuery,
    disciplineSlugs
  };
}