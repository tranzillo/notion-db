// src/lib/disciplineColorUtils.js

/**
 * Available discipline color names
 */
export const DISCIPLINE_COLOR_NAMES = [
  'blue', 'green', 'yellow', 'red', 'purple', 'teal', 'orange', 'pink'
];

/**
 * Generate a simple hash from a string
 * @param {string} str - String to hash
 * @returns {number} - A number between 0 and 2^32 - 1
 */
function simpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
}

/**
 * Assign a color to a discipline based on its ID or title
 * @param {Object} discipline - Discipline object
 * @param {Array} existingAssignments - Optional array of existing color assignments
 * @returns {string} - Color name
 */
export function assignDisciplineColor(discipline, existingAssignments = []) {
  if (!discipline) return null;
  
  // If this discipline already has a color assigned in the existing assignments, use that
  const existing = existingAssignments.find(a => a.id === discipline.id);
  if (existing && existing.colorName) {
    return existing.colorName;
  }
  
  // Otherwise, generate a color based on the discipline ID or title
  const hashSource = discipline.id || discipline.title || '';
  const hash = simpleHash(hashSource);
  const colorIndex = hash % DISCIPLINE_COLOR_NAMES.length;
  
  return DISCIPLINE_COLOR_NAMES[colorIndex];
}

/**
 * Enhance disciplines with color information
 * @param {Array} disciplines - Array of discipline objects
 * @returns {Array} - Enhanced disciplines with color info
 */
export function enhanceDisciplinesWithColors(disciplines) {
  if (!disciplines || !Array.isArray(disciplines)) {
    return [];
  }
  
  // First pass: assign colors
  const enhancedDisciplines = disciplines.map(discipline => {
    const colorName = assignDisciplineColor(discipline);
    return {
      ...discipline,
      colorName,
      colorClass: `discipline-${colorName}`
    };
  });
  
  return enhancedDisciplines;
}

/**
 * Add color data to bottlenecks based on their disciplines
 * @param {Array} bottlenecks - Array of bottleneck objects 
 * @param {Array} disciplinesWithColors - Array of disciplines with color info
 * @returns {Array} - Enhanced bottlenecks with discipline color info
 */
export function addColorsToDisciplinesInBottlenecks(bottlenecks, disciplinesWithColors) {
  if (!bottlenecks || !Array.isArray(bottlenecks)) {
    return [];
  }
  
  if (!disciplinesWithColors || !Array.isArray(disciplinesWithColors)) {
    // If no enhanced disciplines provided, enhance them first
    const enhancedDisciplines = enhanceDisciplinesWithColors(
      bottlenecks
        .map(b => b.discipline)
        .filter(Boolean)
    );
    
    // Create a map for quick lookups
    const disciplineMap = new Map();
    enhancedDisciplines.forEach(d => {
      if (d && d.id) {
        disciplineMap.set(d.id, d);
      }
    });
    
    // Add color info to bottlenecks
    return bottlenecks.map(bottleneck => {
      if (bottleneck.discipline && bottleneck.discipline.id) {
        const enhancedDiscipline = disciplineMap.get(bottleneck.discipline.id);
        if (enhancedDiscipline) {
          return {
            ...bottleneck,
            discipline: enhancedDiscipline
          };
        }
      }
      return bottleneck;
    });
  } else {
    // Create a map of enhanced disciplines for quick lookups
    const disciplineMap = new Map();
    disciplinesWithColors.forEach(d => {
      if (d && d.id) {
        disciplineMap.set(d.id, d);
      }
    });
    
    // Add color info to bottlenecks
    return bottlenecks.map(bottleneck => {
      if (bottleneck.discipline && bottleneck.discipline.id) {
        const enhancedDiscipline = disciplineMap.get(bottleneck.discipline.id);
        if (enhancedDiscipline) {
          return {
            ...bottleneck,
            discipline: enhancedDiscipline
          };
        }
      }
      return bottleneck;
    });
  }
}