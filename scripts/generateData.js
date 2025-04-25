// scripts/generateData.js
import { generateDataExport } from './dataExport.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting data generation...');
  
  try {
    // Generate data files
    const dataDir = await generateDataExport();
    console.log(`Data files generated in: ${dataDir}`);
    
    // Copy data files to the dist directory in case it's different
    const distDataDir = path.resolve(__dirname, '../dist/data');
    
    // Create dist/data directory if it doesn't exist
    if (!fs.existsSync(distDataDir)) {
      fs.mkdirSync(distDataDir, { recursive: true });
    }
    
    // Copy all files from dataDir to distDataDir
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      const sourcePath = path.join(dataDir, file);
      const destPath = path.join(distDataDir, file);
      
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied ${file} to dist directory`);
      }
    }
    
    console.log('Data generation completed successfully');
  } catch (error) {
    console.error('Error during data generation:', error);
    process.exit(1);
  }
}

main();