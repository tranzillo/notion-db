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

    return {
        base: color.formatHex(),
        light: lightHsl.formatHex(),
        dark: darkHsl.formatHex(),
        hover: hoverHsl.formatHex(),
        border: darkHsl.formatHex()
    };
}

/**
 * Generate CSS variables for all discipline colors
 * @param {Array} colorFamilies - Array of color family objects
 * @returns {string} - CSS string with custom properties
 */
export function generateColorCssVariables(colorFamilies) {
    return colorFamilies.map((family, index) => {
        const prefix = `--discipline-color-${index}`;
        return `
  ${prefix}: ${family.base};
  ${prefix}-light: ${family.light};
  ${prefix}-dark: ${family.dark};
  ${prefix}-hover: ${family.hover};
  ${prefix}-border: ${family.border};`;
    }).join('\n');
}

/**
 * Generate CSS rules for discipline colors
 * @param {number} count - Number of disciplines
 * @returns {string} - CSS string with class selectors
 */
export function generateDisciplineColorClasses(count) {
    let css = '';

    for (let i = 0; i < count; i++) {
        css += `
            .discipline-gradient-${i} {
                background-color: var(--discipline-color-${i}-light);
            }

            .discipline-gradient-${i}.active {
                border-color: var(--discipline-color-${i}-dark);
            }

            .discipline-gradient-${i}:hover input + label {
                background-color: var(--discipline-color-${i}-hover) !important;
           }

            .discipline-gradient-${i}.active input + label {
                background-color: var(--discipline-color-${i}-light) !important;
                border-color: var(--discipline-color-${i}-dark) !important;
            }
            
            
            .dark-mode .discipline-gradient-${i} {
                border-color: var(--discipline-color-${i}-dark) !important;
                color: #818374 !important;
                background-color: transparent !important;
            }

            .dark-mode .discipline-gradient-${i}.active {
                color: var(--discipline-color-${i}-hover) !important;
            }

            .dark-mode .discipline-gradient-${i}:hover input + label {
                border-color: var(--discipline-color-${i}-dark) !important;
                color: var(--discipline-color-${i}-hover) !important;
                background-color: transparent !important;
           }

            .dark-mode .discipline-gradient-${i}.active input + label {
                color: var(--discipline-color-${i}-light) !important;
                background-color: transparent !important;
            }`;
    }

    return css;
}

/**
 * Generate complete CSS for discipline colors
 * @param {Array} disciplines - Array of discipline objects
 * @param {Array} colorRange - Optional array of colors defining gradient endpoints
 * @returns {string} - Complete CSS string for discipline colors
 */
export function generateDisciplineColorCss(disciplines, colorRange) {
    const count = disciplines.length;

    // Generate base colors from gradient
    const baseColors = generateGradientColors(count, colorRange);

    // Create color families for each base color
    const colorFamilies = baseColors.map(generateColorFamily);

    // Generate CSS variables
    const cssVariables = generateColorCssVariables(colorFamilies);

    // Generate class selectors
    const cssClasses = generateDisciplineColorClasses(count);

    // Combine into complete CSS
    return `:root {
${cssVariables}
}

${cssClasses}`;
}

/**
 * Enhance disciplines with color information for static generation
 * @param {Array} disciplines - Array of discipline objects
 * @param {Array} colorRange - Optional array of colors defining gradient endpoints
 * @returns {Object} - Object with enhanced disciplines and CSS
 */
export function enhanceDisciplinesWithStaticColors(disciplines, colorRange = ['#4361ee', '#7209b7', '#f72585']) {
    if (!disciplines || !Array.isArray(disciplines) || disciplines.length === 0) {
        return { enhancedDisciplines: [], css: '' };
    }

    // Generate base colors from gradient
    const baseColors = generateGradientColors(disciplines.length, colorRange);

    // Enhance disciplines with color information
    const enhancedDisciplines = disciplines.map((discipline, index) => {
        const colorName = `gradient-${index}`;
        const colorClass = `discipline-gradient-${index}`;

        return {
            ...discipline,
            colorName,
            colorClass
        };
    });

    // Generate the CSS
    const css = generateDisciplineColorCss(disciplines, colorRange);

    return {
        enhancedDisciplines,
        css
    };
}