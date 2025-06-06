// src/integrations/fieldColors.js
import fs from 'fs';
import path from 'path';
import { enhanceFieldsWithStaticColors } from '../lib/enhancedColorUtils';
import { extractFields } from '../lib/dataUtils';
import { getAllData } from '../lib/notion';
import { createFieldSlug } from '../lib/slugUtils';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Astro integration for field color generation
 * @returns {Object} - Astro integration object
 */
export default function fieldColorsIntegration() {
  return {
    name: 'field-colors-integration',
    hooks: {
      'astro:config:setup': async ({ logger }) => {
        logger.info('Starting field color generation');
        
        // Verify that required environment variables are set
        const requiredEnvVars = [
          'NOTION_API_KEY',
          'NOTION_BOTTLENECKS_DB_ID',
          'NOTION_FIELDS_DB_ID'
        ];
        
        const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        if (missingVars.length > 0) {
          logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
          logger.info('Skipping field color generation due to missing environment variables');
          return;
        }
        
        try {
          // Log the database IDs being used (for debugging)
          logger.info(`Using NOTION_BOTTLENECKS_DB_ID: ${process.env.NOTION_BOTTLENECKS_DB_ID}`);
          logger.info(`Using NOTION_FIELDS_DB_ID: ${process.env.NOTION_FIELDS_DB_ID}`);
          
          // Fetch data from Notion
          const { bottlenecks } = await getAllData();
          
          // Extract unique fields
          const fieldsWithoutColors = extractFields(bottlenecks);
          
          logger.info(`Found ${fieldsWithoutColors.length} unique fields`);
          
          // Log the fields before alphabetization
          logger.info('Fields before alphabetical sorting:');
          fieldsWithoutColors.forEach((field, index) => {
            logger.info(`${index + 1}. ${field.field_name} (${field.id})`);
          });
          
          // Process fields to ensure they have valid slugs
          const fieldsWithSlugs = fieldsWithoutColors.map(field => ({
            ...field,
            slug: createFieldSlug(field.field_name)
          }));
          
          // Generate colors - fields will be sorted alphabetically inside this function
          const { enhancedFields, css } = enhanceFieldsWithStaticColors(
            fieldsWithSlugs,
            [   '#94eead', 
                '#94ced3', 
                '#9bb7dd', 
                '#bc95dd', 
                '#e69e9d', 
                '#e4b98f', 
                '#e9d787',
            ] // Color range - customize as needed
          );
          
          // Log the fields after alphabetization and color assignment
          logger.info('Fields after alphabetical sorting and color assignment:');
          enhancedFields.forEach((field, index) => {
            logger.info(`${index + 1}. ${field.field_name} (${field.id}) - Color: ${field.colorClass}`);
          });
          
          // Ensure directories exist
          const cssDir = path.resolve('./src/styles/generated');
          if (!fs.existsSync(cssDir)) {
            fs.mkdirSync(cssDir, { recursive: true });
          }
          
          // Write CSS to file
          const cssPath = path.resolve('./src/styles/generated/field-colors.css');
          fs.writeFileSync(cssPath, css);
          
          // Generate JS module with enhanced fields
          const jsContent = `// Generated field color data - DO NOT EDIT
export const enhancedFields = ${JSON.stringify(enhancedFields, null, 2)};

// Also export a sorted version for UI components
export const sortedEnhancedFields = ${JSON.stringify(
  [...enhancedFields].sort((a, b) => (a.field_name || '').localeCompare(b.field_name || '')),
  null, 2
)};`;
          
          const jsPath = path.resolve('./src/lib/generated/fieldColorData.js');
          
          // Ensure directory exists
          const jsDir = path.dirname(jsPath);
          if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
          }
          
          fs.writeFileSync(jsPath, jsContent);
          
          logger.info(`Generated field colors for ${enhancedFields.length} fields`);
          logger.info(`- CSS written to: ${cssPath}`);
          logger.info(`- JS data written to: ${jsPath}`);
        } catch (error) {
          logger.error('Error generating field colors:');
          logger.error(error);
        }
      }
    }
  };
}