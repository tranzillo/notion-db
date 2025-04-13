// src/lib/enhancedColorUtils.js
import * as d3 from 'd3';

/**
 * Generate a simple hash from a string - preserved from old system for consistency
 * @param {string} str - String to hash
 * @returns {number} - A number between 0 and 2^32 - 1
 */
export function simpleHash(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash);
}

/**
 * Generate an array of evenly distributed colors from a gradient
 * @param {number} count - Number of colors to generate
 * @param {Array} colorRange - Array of colors defining the gradient endpoints (hex or named colors)
 * @returns {Array} - Array of hex color strings
 */
export function generateGradientColors(count, colorRange = ['#4361ee', '#7209b7', '#f72585']) {
    // Handle edge cases
    if (count <= 0) return [];
    if (count === 1) return [colorRange[Math.floor(colorRange.length / 2)]];

    // Create a color scale using D3's interpolation
    const colorScale = d3.scaleLinear()
        .domain([0, Math.max(1, count - 1)])
        .range([0, 1]);

    // Create an interpolator from the color range
    const colorInterpolator = d3.interpolateRgbBasis(colorRange);

    // Generate the specified number of colors
    return Array.from({ length: count }, (_, i) => {
        // Get interpolated color and convert to hex
        const rgbColor = d3.color(colorInterpolator(colorScale(i)));
        return rgbColor.formatHex();
    });
}

/**
 * Generate a family of color variations for a base color
 * @param {string} baseColor - Base color in hex format
 * @returns {Object} - Object with color variations (base, light, dark, text, border)
 */
export function generateColorFamily(baseColor) {
    const color = d3.color(baseColor);

    // Convert to HSL for easier manipulation
    const hsl = d3.hsl(color);

    // Create variations
    const lightHsl = d3.hsl(hsl.h, Math.min(hsl.s * 0.8, 1), Math.min(hsl.l * 1.2, 0.95));
    const darkHsl = d3.hsl(hsl.h, Math.min(hsl.s * 1.1, 1), Math.max(hsl.l * 0.7, 0.15));
    const hoverHsl = d3.hsl(hsl.h, Math.min(hsl.s * 0.9, 1), Math.min(hsl.l * 1.1, 0.9));
    
    const bgColorHsl = d3.hsl(hsl);
    
    // Convert to RGB to properly support opacity
    const bgDarkColorRgb = d3.rgb(bgColorHsl);
    bgDarkColorRgb.opacity = 0.04; 

    const bgLightColorRgb = d3.rgb(bgColorHsl);
    bgLightColorRgb.opacity = 0.07; 

    return {
        base: color.formatHex(),
        light: lightHsl.formatHex(),
        dark: darkHsl.formatHex(),
        hover: hoverHsl.formatHex(),
        border: darkHsl.formatHex(),
        bgDark: bgDarkColorRgb.formatRgb(),
        bgLight: bgLightColorRgb.formatRgb()
    };
}

/**
 * Generate CSS variables for all field colors
 * @param {Array} colorFamilies - Array of color family objects
 * @returns {string} - CSS string with custom properties
 */
export function generateColorCssVariables(colorFamilies) {
    return colorFamilies.map((family, index) => {
        const prefix = `--field-color-${index}`;
        return `
  ${prefix}: ${family.base};
  ${prefix}-light: ${family.light};
  ${prefix}-dark: ${family.dark};
  ${prefix}-hover: ${family.hover};
  ${prefix}-border: ${family.border};
  ${prefix}-bgDark: ${family.bgDark};
  ${prefix}-bgLight: ${family.bgLight};`
    }).join('\n');
}

/**
 * Generate CSS rules for field colors
 * @param {number} count - Number of fields
 * @returns {string} - CSS string with class selectors
 */
export function generateFieldColorClasses(count) {
    let css = '';

    for (let i = 0; i < count; i++) {
        css += `
            .field-gradient-${i} {
                background-color: var(--field-color-${i}-light);
            }

            .field-gradient-${i}.active {
                border-color: var(--field-color-${i}-dark);
            }

            .field-gradient-${i}:hover input + label {
                background-color: var(--field-color-${i}-hover) !important;
           }

            .field-gradient-${i}.active input + label {
                background-color: var(--field-color-${i}-light) !important;
                border-color: var(--field-color-${i}-dark) !important;
            }

            .bottleneck-card:has(.field-gradient-${i}) {
                background-color: var(--field-color-${i}-bgLight);
            }

            .dark-mode .field-gradient-${i} {
                border-color: var(--field-color-${i}-dark) !important;
                color: #818374 !important;
                background-color: transparent !important;
            }

            .dark-mode .field-gradient-${i}.active {
                color: var(--field-color-${i}-hover) !important;
            }

            .dark-mode .field-gradient-${i}:hover input + label {
                border-color: var(--field-color-${i}-dark) !important;
                color: var(--field-color-${i}-hover) !important;
                background-color: transparent !important;
           }

            .dark-mode .field-gradient-${i}.active input + label {
                color: var(--field-color-${i}-light) !important;
                background-color: transparent !important;
            }

            .dark-mode .bottleneck-card:has(.field-gradient-${i}) {
                background-color: var(--field-color-${i}-bgDark);
            }   
            `;
    }

    return css;
}

/**
 * Generate complete CSS for field colors
 * @param {Array} fields - Array of field objects
 * @param {Array} colorRange - Optional array of colors defining gradient endpoints
 * @returns {string} - Complete CSS string for field colors
 */
export function generateFieldColorCss(fields, colorRange) {
    const count = fields.length;

    // Generate base colors from gradient
    const baseColors = generateGradientColors(count, colorRange);

    // Create color families for each base color
    const colorFamilies = baseColors.map(generateColorFamily);

    // Generate CSS variables
    const cssVariables = generateColorCssVariables(colorFamilies);

    // Generate class selectors
    const cssClasses = generateFieldColorClasses(count);

    // Combine into complete CSS
    return `:root {
${cssVariables}
}

${cssClasses}`;
}

/**
 * Enhance fields with color information for static generation
 * @param {Array} fields - Array of field objects
 * @param {Array} colorRange - Optional array of colors defining gradient endpoints
 * @returns {Object} - Object with enhanced fields and CSS
 */
export function enhanceFieldsWithStaticColors(fields, colorRange = ['#4361ee', '#7209b7', '#f72585']) {
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return { enhancedFields: [], css: '' };
    }

    // Sort fields alphabetically by field_name
    const sortedFields = [...fields].sort((a, b) => 
        (a.field_name || '').localeCompare(b.field_name || '')
    );
    
    console.log('Fields sorted alphabetically for color assignment:');
    sortedFields.forEach((field, index) => {
        console.log(`${index + 1}. ${field.field_name}`);
    });

    // Generate base colors from gradient for sorted fields
    const baseColors = generateGradientColors(sortedFields.length, colorRange);

    // Enhance fields with color information
    const enhancedFields = sortedFields.map((field, index) => {
        const colorName = `gradient-${index}`;
        const colorClass = `field-gradient-${index}`;

        return {
            ...field,
            colorName,
            colorClass,
            colorIndex: index // Store the index for debugging and reference
        };
    });

    // Generate the CSS based on the sorted fields
    const css = generateFieldColorCss(sortedFields, colorRange);

    return {
        enhancedFields,
        css
    };
}

/**
 * Helper function to get field color CSS class based on field ID
 * @param {string} fieldId - Field ID to get color class for
 * @param {Array} enhancedFields - Array of enhanced field objects with color info
 * @returns {string} - CSS class for the field color
 */
export function getFieldColorClass(fieldId, enhancedFields) {
    const field = enhancedFields.find(field => field.id === fieldId);
    return field ? field.colorClass : '';
}

/**
 * Get a random field color class
 * @param {number} seed - Optional seed number for deterministic selection
 * @param {number} totalColors - Total number of available color classes
 * @returns {string} - Random field color CSS class
 */
export function getRandomFieldColorClass(seed, totalColors = 8) {
    const index = seed 
        ? Math.abs(seed) % totalColors 
        : Math.floor(Math.random() * totalColors);
    return `field-gradient-${index}`;
}

export default {
    simpleHash,
    generateGradientColors,
    generateColorFamily,
    generateColorCssVariables,
    generateFieldColorClasses,
    generateFieldColorCss,
    enhanceFieldsWithStaticColors,
    getFieldColorClass,
    getRandomFieldColorClass
};