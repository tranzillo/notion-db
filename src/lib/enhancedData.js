// src/lib/enhancedData.js

import { getAllData } from './notion';
import { extractDisciplines } from './dataUtils';
import { enhanceDisciplinesWithColors, addColorsToDisciplinesInBottlenecks } from './disciplineColorUtils';

/**
 * Get all data from Notion and enhance it with color information
 * @returns {Object} Enhanced data with color information
 */
export async function getEnhancedData() {
  // Fetch raw data from Notion
  const { 
    bottlenecks: originalBottlenecks,
    solutions,
    references 
  } = await getAllData();
  
  // Extract and enhance disciplines with colors
  const disciplinesWithoutColors = extractDisciplines(originalBottlenecks);
  const disciplines = enhanceDisciplinesWithColors(disciplinesWithoutColors);
  
  // Add color information to bottlenecks' disciplines
  const bottlenecks = addColorsToDisciplinesInBottlenecks(originalBottlenecks, disciplines);
  
  return {
    bottlenecks,
    solutions,
    references,
    disciplines
  };
}