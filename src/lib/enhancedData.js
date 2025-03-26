// src/lib/enhancedData.js

import { getAllData } from './notion';
import { extractDisciplines } from './dataUtils';

// Import pre-generated discipline color data when available,
// otherwise provide an empty array for SSG to work properly
let enhancedDisciplines = [];

try {
  // This module is created at build time
  const disciplineColorData = import.meta.glob('./generated/disciplineColorData.js', { eager: true });
  if (disciplineColorData['./generated/disciplineColorData.js']) {
    enhancedDisciplines = disciplineColorData['./generated/disciplineColorData.js'].enhancedDisciplines;
  }
} catch (error) {
  console.error('Error loading pre-generated discipline colors', error);
  // Continue with empty array
}

/**
 * Match a discipline with its enhanced color data
 * @param {Object} discipline - Original discipline object
 * @returns {Object} - Discipline with color data
 */
function enhanceDiscipline(discipline) {
  if (!discipline || !discipline.id) return discipline;
  
  const enhancedDiscipline = enhancedDisciplines.find(d => d.id === discipline.id);
  
  if (enhancedDiscipline) {
    return {
      ...discipline,
      colorName: enhancedDiscipline.colorName,
      colorClass: enhancedDiscipline.colorClass
    };
  }
  
  return discipline;
}

/**
 * Get all data from Notion and enhance it with pre-generated color information
 * @returns {Object} Enhanced data
 */
export async function getEnhancedData() {
  // Fetch raw data from Notion
  const { 
    bottlenecks: originalBottlenecks,
    solutions,
    references 
  } = await getAllData();
  
  // Extract disciplines without colors
  const disciplinesWithoutColors = extractDisciplines(originalBottlenecks);
  
  // Enhance disciplines with pre-generated colors
  const disciplines = disciplinesWithoutColors.map(enhanceDiscipline);
  
  // Add color information to bottlenecks' disciplines
  const bottlenecks = originalBottlenecks.map(bottleneck => {
    if (bottleneck.discipline && bottleneck.discipline.id) {
      const enhancedDiscipline = disciplines.find(d => d.id === bottleneck.discipline.id);
      if (enhancedDiscipline) {
        return {
          ...bottleneck,
          discipline: enhancedDiscipline
        };
      }
    }
    return bottleneck;
  });
  
  return {
    bottlenecks,
    solutions,
    references,
    disciplines
  };
}