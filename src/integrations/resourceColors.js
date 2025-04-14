// src/integrations/resourceColors.js
import fs from 'fs';
import path from 'path';
import * as d3 from 'd3';
import { getAllData } from '../lib/notion';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Helper function to create a slug from a resource type
 * @param {string} resourceType - Resource type name
 * @returns {string} - Slugified resource type
 */
function createResourceTypeSlug(resourceType) {
  if (!resourceType) return 'unknown';
  
  return resourceType
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Generate a color palette for resource types
 * @param {number} count - Number of colors needed
 * @returns {Array} - Array of color objects with light/dark variants
 */
function generateColorPalette(count) {
  // Base colors to interpolate between
  const baseColors = [
    '#94d3ad', // Green
    '#94d3e2', // Blue
    '#9487dd', // Purple
    '#c595dd', // Violet
    '#e69ead', // Pink
    '#e4c98f', // Orange
    '#d7e987'  // Yellow-green
  ];
  
  // Generate more colors if needed by interpolating between base colors
  let colors = [];
  if (count <= baseColors.length) {
    colors = baseColors.slice(0, count);
  } else {
    // Create a color scale using D3
    const colorScale = d3.scaleLinear()
      .domain([0, Math.max(1, count - 1)])
      .range([0, 1]);
    
    const colorInterpolator = d3.interpolateRgbBasis(baseColors);
    
    colors = Array.from({ length: count }, (_, i) => {
      const rgbColor = d3.color(colorInterpolator(colorScale(i)));
      return rgbColor.formatHex();
    });
  }
  
  // Generate light and dark variants for each color
  return colors.map(baseColor => {
    const color = d3.color(baseColor);
    const hsl = d3.hsl(color);
    
    // Create lighter variation
    const lightHsl = d3.hsl(
      hsl.h,
      Math.max(0.1, hsl.s * 0.6),
      Math.min(0.95, hsl.l * 1.3)
    );
    
    // Create darker variation
    const darkHsl = d3.hsl(
      hsl.h,
      Math.min(1, hsl.s * 1.1),
      Math.max(0.15, hsl.l * 0.7)
    );
    
    return {
      base: color.formatHex(),
      light: lightHsl.formatHex(),
      dark: darkHsl.formatHex()
    };
  });
}

/**
 * Astro integration for resource type color generation
 * @returns {Object} - Astro integration object
 */
export default function resourceColorsIntegration() {
  return {
    name: 'resource-colors-integration',
    hooks: {
      'astro:config:setup': async ({ logger }) => {
        logger.info('Starting resource type color generation');
        
        // Verify that required environment variables are set
        const requiredEnvVars = [
          'NOTION_API_KEY',
          'NOTION_RESOURCES_DB_ID'
        ];
        
        const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        if (missingVars.length > 0) {
          logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
          logger.info('Creating fallback color files');
          
          ensureDirectoriesExist();
          createEmptyFiles();
          return;
        }
        
        try {
          // Fetch data from Notion
          const { resourceTypeOptions } = await getAllData();
          
          logger.info(`Found ${resourceTypeOptions.length} resource types`);
          
          if (!resourceTypeOptions || resourceTypeOptions.length === 0) {
            logger.warn('No resource types found, using fallback data');
            ensureDirectoriesExist();
            createEmptyFiles();
            return;
          }
          
          // Generate color palette
          const colorPalette = generateColorPalette(resourceTypeOptions.length);
          
          // Create resource type data with slugs and colors
          const resourceTypes = resourceTypeOptions.map((type, index) => {
            const slug = createResourceTypeSlug(type);
            const colors = colorPalette[index % colorPalette.length];
            
            return {
              name: type,
              slug,
              colors
            };
          });
          
          // Generate the CSS
          const css = generateCss(resourceTypes);
          
          // Generate the JS mapping
          const jsMapping = {};
          resourceTypes.forEach(type => {
            jsMapping[type.name] = type.slug;
          });
          
          // Ensure directories exist
          ensureDirectoriesExist();
          
          // Write the files
          writeResourceColorFiles(css, jsMapping, resourceTypes);
          
          logger.info(`Generated resource type colors for ${resourceTypes.length} types`);
        } catch (error) {
          logger.error('Error generating resource type colors:');
          logger.error(error);
          
          ensureDirectoriesExist();
          createEmptyFiles();
        }
      }
    }
  };
}

/**
 * Generate CSS for resource types
 * @param {Array} resourceTypes - Array of resource type objects
 * @returns {string} - Generated CSS
 */
function generateCss(resourceTypes) {
  let css = '/* Generated resource type color styles */\n\n';
  
  // Add selectors for each resource type
  resourceTypes.forEach(type => {
    css += `
  /* ${type.name} */
  main .resource-type-gradient-${type.slug} {
    background-color: ${type.colors.light};
    color: #404137;
    border-color: ${type.colors.base};
  }

  /* Dark mode styles */
  .dark-mode .resource-type-gradient-${type.slug} {
    background-color: transparent;
    color: #a0a094;
    border-color: ${type.colors.dark};
  }
  .capability-card__resource-link:has(.resource-type-gradient-${type.slug}), .capability-detail__resource-item:has(.resource-type-gradient-${type.slug}) {
    background-color: ${type.colors.base}24;
  }
  .dark-mode .capability-card__resource-link:has(.resource-type-gradient-${type.slug}), .dark-mode .capability-detail__resource-item:has(.resource-type-gradient-${type.slug}) {
    background-color: ${type.colors.base}12;
  }
  .capability-card__resource-link:hover:has(.resource-type-gradient-${type.slug}) a, .capability-detail__resource-item:hover:has(.resource-type-gradient-${type.slug}) a {
    color: ${type.colors.dark};
  }
  .dark-mode .capability-card__resource-link:hover:has(.resource-type-gradient-${type.slug}) a, .dark-mode .capability-detail__resource-item:hover:has(.resource-type-gradient-${type.slug}) a {
    color: ${type.colors.base};
  }

  .resource-card:has(.resource-type-gradient-${type.slug}) {
    background-color: ${type.colors.base}24;
  }
  .dark-mode .resource-card:has(.resource-type-gradient-${type.slug}) {
    background-color: ${type.colors.base}12;
  }
`;
  });
  
  return css;
}

/**
 * Ensure necessary directories exist
 */
function ensureDirectoriesExist() {
  // Ensure CSS directory exists
  const cssDir = path.resolve('./src/styles/generated');
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }
  
  // Ensure JS directory exists
  const jsDir = path.resolve('./src/lib/generated');
  if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
  }
}

/**
 * Create empty files as fallbacks if data generation fails
 */
function createEmptyFiles() {
  // Create a basic fallback CSS file
  const cssPath = path.resolve('./src/styles/generated/resource-type-colors.css');
  const fallbackCss = `/* Fallback resource type colors */
.resource-type-gradient-publication {
  background-color: #cae5d5;
  color: #333;
  border-color: #44b772;
}

.dark-mode .resource-type-gradient-publication {
  background-color: transparent;
  color: #cae5d5;
  border-color: #44b772;
}
`;
  fs.writeFileSync(cssPath, fallbackCss);
  
  // Create a basic JS mapping file
  const jsPath = path.resolve('./src/lib/generated/resourceTypeColorData.js');
  fs.writeFileSync(jsPath, `// Fallback resource type color data
export const resourceTypeColorMap = {
  "Publication": "publication"
};
export const enhancedResourceTypes = [
  {
    "name": "Publication",
    "slug": "publication",
    "colors": {
      "base": "#94d3ad",
      "light": "#cae5d5",
      "dark": "#44b772"
    }
  }
];
`);
}

/**
 * Write resource color files to the file system
 */
function writeResourceColorFiles(css, resourceTypeColorMap, resourceTypes) {
  // Write CSS file
  const cssPath = path.resolve('./src/styles/generated/resource-type-colors.css');
  fs.writeFileSync(cssPath, css);
  
  // Write JS module
  const jsPath = path.resolve('./src/lib/generated/resourceTypeColorData.js');
  fs.writeFileSync(jsPath, `// Generated resource type color data - DO NOT EDIT
export const resourceTypeColorMap = ${JSON.stringify(resourceTypeColorMap, null, 2)};
export const enhancedResourceTypes = ${JSON.stringify(resourceTypes, null, 2)};
`);
}