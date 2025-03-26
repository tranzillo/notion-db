// scripts/test-discipline-colors.js
import * as d3 from 'd3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enhanceDisciplinesWithStaticColors } from '../src/lib/enhancedColorUtils.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample disciplines for testing
const sampleDisciplines = [
  { id: '1', title: 'Biology' },
  { id: '2', title: 'Chemistry' },
  { id: '3', title: 'Physics' },
  { id: '4', title: 'Computer Science' },
  { id: '5', title: 'Mathematics' },
  { id: '6', title: 'Economics' }
];

// Custom color range
const colorRange = ['#4361ee', '#7209b7', '#f72585'];

// Run the color generation
console.log(`Generating colors for ${sampleDisciplines.length} sample disciplines...`);
const { enhancedDisciplines, css } = enhanceDisciplinesWithStaticColors(sampleDisciplines, colorRange);

// Create output directories
const outputDir = path.resolve(__dirname, '../src/styles/generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Save the CSS file
const cssPath = path.resolve(outputDir, 'discipline-colors.css');
fs.writeFileSync(cssPath, css);
console.log(`CSS written to: ${cssPath}`);

// Generate JS module with enhanced disciplines
const jsContent = `// Generated discipline color data - DO NOT EDIT
export const enhancedDisciplines = ${JSON.stringify(enhancedDisciplines, null, 2)};`;

const jsDir = path.resolve(__dirname, '../src/lib/generated');
if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}

const jsPath = path.resolve(jsDir, 'disciplineColorData.js');
fs.writeFileSync(jsPath, jsContent);
console.log(`JS data written to: ${jsPath}`);

// Also output a preview HTML file for visual inspection
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discipline Color Preview</title>
  <style>
${css}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.color-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.color-header {
  padding: 1rem;
  font-weight: bold;
}

.color-samples {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.color-sample {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  font-size: 0.875rem;
}

.color-info {
  padding: 1rem;
  font-size: 0.875rem;
}

.color-variant {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.color-name {
  font-weight: 500;
}

.color-value {
  font-family: monospace;
  opacity: 0.8;
}
  </style>
</head>
<body>
  <h1>Discipline Color Preview</h1>
  
  <div class="preview-grid">
    ${enhancedDisciplines.map((discipline, index) => {
      return `
    <div class="color-card">
      <div class="color-header discipline-gradient-${index}">${discipline.title}</div>
      <div class="color-samples">
        <div class="color-sample discipline-gradient-${index}">Normal</div>
        <div class="color-sample discipline-gradient-${index} active">Active</div>
      </div>
      <div class="color-info">
        <div class="color-variant">
          <span class="color-name">Base:</span>
          <span class="color-value">var(--discipline-color-${index})</span>
        </div>
        <div class="color-variant">
          <span class="color-name">Light:</span>
          <span class="color-value">var(--discipline-color-${index}-light)</span>
        </div>
        <div class="color-variant">
          <span class="color-name">Dark:</span>
          <span class="color-value">var(--discipline-color-${index}-dark)</span>
        </div>
        <div class="color-variant">
          <span class="color-name">Hover:</span>
          <span class="color-value">var(--discipline-color-${index}-hover)</span>
        </div>
      </div>
    </div>`;
    }).join('')}
  </div>
</body>
</html>`;

const htmlPath = path.resolve(outputDir, 'discipline-colors-preview.html');
fs.writeFileSync(htmlPath, htmlContent);
console.log(`HTML preview written to: ${htmlPath}`);

console.log('Color generation complete!');