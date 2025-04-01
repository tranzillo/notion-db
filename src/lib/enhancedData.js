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
  
  // If no pre-generated color is found, assign a default color class
  // based on the discipline ID to ensure consistency
  const colorId = Math.abs(discipline.id.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0) % 8);
  
  return {
    ...discipline,
    colorName: `gradient-${colorId}`,
    colorClass: `discipline-gradient-${colorId}`
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
    solutions: originalSolutions,
    references,
    referenceTypeOptions
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
  
  // Create solutions with associated bottlenecks (but avoid circular references)
  const solutions = originalSolutions.map(solution => {
    // Generate slug if needed
    const slug = solution.slug || solution.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    
    // Find associated bottlenecks from the enhanced bottlenecks array
    const associatedBottlenecks = bottlenecks
      .filter(bottleneck => bottleneck.solutions.some(s => s.id === solution.id))
      .map(bottleneck => ({
        id: bottleneck.id,
        title: bottleneck.title,
        content: bottleneck.content,
        slug: bottleneck.slug,
        discipline: bottleneck.discipline, // This has the colorClass from above
        rank: bottleneck.rank,
        tags: bottleneck.tags,
        privateTags: bottleneck.privateTags
        // No solutions array to avoid circular references
      }));
    
    return {
      ...solution,
      slug,
      bottlenecks: associatedBottlenecks
    };
  });
  
  return {
    bottlenecks,
    solutions,
    references,
    disciplines,
    referenceTypeOptions
  };
}