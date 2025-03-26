// src/integrations/disciplineColors.js
import fs from 'fs';
import path from 'path';
import { enhanceDisciplinesWithStaticColors } from '../lib/enhancedColorUtils';
import { extractDisciplines } from '../lib/dataUtils';
import { getAllData } from '../lib/notion';

/**
 * Astro integration for discipline color generation
 * @returns {Object} - Astro integration object
 */
export default function disciplineColorsIntegration() {
  return {
    name: 'discipline-colors-integration',
    hooks: {
      'astro:config:setup': async ({ logger }) => {
        logger.info('Starting discipline color generation');
        
        try {
          // Fetch data from Notion
          const { bottlenecks } = await getAllData();
          
          // Extract unique disciplines
          const disciplines = extractDisciplines(bottlenecks);
          
          logger.info(`Found ${disciplines.length} unique disciplines`);
          
          // Generate colors
          const { enhancedDisciplines, css } = enhanceDisciplinesWithStaticColors(
            disciplines,
            [   '#94eead', 
                '#94ced3', 
                '#9bb7dd', 
                '#bc95dd', 
                '#e69e9d', 
                '#e4b98f', 
                '#e9d787',
            ] // Color range - customize as needed
          );
          
          // Ensure directories exist
          const cssDir = path.resolve('./src/styles/generated');
          if (!fs.existsSync(cssDir)) {
            fs.mkdirSync(cssDir, { recursive: true });
          }
          
          // Write CSS to file
          const cssPath = path.resolve('./src/styles/generated/discipline-colors.css');
          fs.writeFileSync(cssPath, css);
          
          // Generate JS module with enhanced disciplines
          const jsContent = `// Generated discipline color data - DO NOT EDIT
export const enhancedDisciplines = ${JSON.stringify(enhancedDisciplines, null, 2)};`;
          
          const jsPath = path.resolve('./src/lib/generated/disciplineColorData.js');
          
          // Ensure directory exists
          const jsDir = path.dirname(jsPath);
          if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
          }
          
          fs.writeFileSync(jsPath, jsContent);
          
          logger.info(`Generated discipline colors for ${disciplines.length} disciplines`);
          logger.info(`- CSS written to: ${cssPath}`);
          logger.info(`- JS data written to: ${jsPath}`);
        } catch (error) {
          logger.error('Error generating discipline colors:');
          logger.error(error);
        }
      }
    }
  };
}