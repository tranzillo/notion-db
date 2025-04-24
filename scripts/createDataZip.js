// scripts/createDataZip.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { generateDataExport } from './dataExport.js';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log function with timestamps
function log(message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Create a ZIP file containing the formatted data files
 */
export async function createDataZip() {
  try {
    log('Starting ZIP package creation...');
    
    // First generate the data export
    log('Generating data export...');
    const dataDir = await generateDataExport();
    log(`Data export generated in: ${dataDir}`);
    
    // Output path for the ZIP file
    const outputDir = path.resolve(__dirname, '../public/download');
    const outputPath = path.join(outputDir, 'gapmap-data.zip');
    
    log(`Output directory: ${outputDir}`);
    log(`Output ZIP file: ${outputPath}`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a file to stream archive data to
    log('Creating ZIP archive...');
    const output = fs.createWriteStream(outputPath);
    
    // Set up the archiver
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Create a promise to handle the archiving completion
    const archivePromise = new Promise((resolve, reject) => {
      // Listen for all archive data to be written
      output.on('close', function() {
        log('ZIP file finalized successfully');
        log(`Total ZIP size: ${archive.pointer()} bytes`);
        resolve(outputPath);
      });
      
      // Handle warnings
      archive.on('warning', function(err) {
        if (err.code === 'ENOENT') {
          log(`Warning during ZIP creation: ${err.message}`);
        } else {
          log(`Error during ZIP creation: ${err.message}`);
          reject(err);
        }
      });
      
      // Handle errors
      archive.on('error', function(err) {
        log(`Error during ZIP creation: ${err.message}`);
        reject(err);
      });
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Check if data directory exists
    if (!fs.existsSync(dataDir)) {
      log(`Data directory does not exist: ${dataDir}`);
      throw new Error(`Data directory does not exist: ${dataDir}`);
    }
    
    // List files in the directory (for debugging)
    log(`Listing files in data directory: ${dataDir}`);
    const files = fs.readdirSync(dataDir);
    log(`Found ${files.length} files: ${files.join(', ')}`);
    
    // Add the entire data directory to the archive
    log(`Adding directory to ZIP: ${dataDir}`);
    archive.directory(dataDir, 'gapmap-data');
    
    // Finalize the archive (i.e. we are done appending files)
    log('Finalizing ZIP archive...');
    await archive.finalize();
    
    // Wait for the archive to be completely written
    const zipPath = await archivePromise;
    
    log(`ZIP file created successfully at: ${zipPath}`);
    return zipPath;
  } catch (error) {
    console.error('Error creating ZIP:');
    console.error(error);
    throw error;
  }
}

// Main execution block
log("STARTING ZIP CREATION SCRIPT");
createDataZip()
  .then(zipPath => {
    log(`COMPLETED: ZIP creation successful. File available at: ${zipPath}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILED: ZIP creation process encountered an error:');
    console.error(err);
    process.exit(1);
  });