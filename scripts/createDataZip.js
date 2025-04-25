// scripts/createDataZip.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic log function that writes to both console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${message}`;
  console.log(logMsg);
}

/**
 * Create a ZIP file from the data directory
 */
async function createZip() {
  log('Starting ZIP creation process');
  
  // Define paths - using dist directory instead of public for Netlify
  const rootDir = path.resolve(__dirname, '..');
  // Use let instead of const for variables that might be reassigned
  let dataDir = path.resolve(rootDir, 'dist/data');
  let outputDir = path.resolve(rootDir, 'dist/download');
  let outputPath = path.join(outputDir, 'gapmap-data.zip');
  
  log(`Data directory: ${dataDir}`);
  log(`Output directory: ${outputDir}`);
  log(`Output file: ${outputPath}`);
  
  // Verify data directory exists - if not, try fallback paths
  if (!fs.existsSync(dataDir)) {
    log(`Data directory not found at ${dataDir}, trying alternative paths...`);
    
    // Try alternative paths that might work in Netlify
    const altDataDirs = [
      path.resolve(rootDir, 'public/data'),
      path.resolve(rootDir, 'dist/data'),
      path.resolve(rootDir, 'out/data'),
      path.resolve(rootDir, 'build/data')
    ];
    
    // Try to find a valid data directory
    const validDir = altDataDirs.find(dir => fs.existsSync(dir));
    if (validDir) {
      log(`Found alternative data directory at: ${validDir}`);
      // Update dataDir to use the valid directory
      dataDir = validDir;
      // Update outputDir to be in the same parent folder as dataDir
      const parentDir = path.dirname(validDir);
      outputDir = path.join(parentDir, 'download');
      outputPath = path.join(outputDir, 'gapmap-data.zip');
      log(`Updated output path to: ${outputPath}`);
    } else {
      log('ERROR: Could not find data directory in any expected location');
      return null;
    }
  }
  
  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    log('Creating output directory');
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check if there are files to zip
  const files = fs.readdirSync(dataDir).filter(file => 
    fs.statSync(path.join(dataDir, file)).isFile()
  );
  
  if (files.length === 0) {
    log('ERROR: No files found in data directory');
    return null;
  }
  
  log(`Found ${files.length} files to archive`);
  
  // Create a writable stream for the zip file
  let output;
  try {
    // Remove existing zip file if it exists
    if (fs.existsSync(outputPath)) {
      log('Removing existing zip file');
      fs.unlinkSync(outputPath);
    }
    
    log('Creating output stream');
    output = fs.createWriteStream(outputPath);
  } catch (err) {
    log(`ERROR creating output stream: ${err.message}`);
    return null;
  }
  
  // Create and configure the archive
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Prepare promise to track completion
  return new Promise((resolve, reject) => {
    // Listen for errors on the output stream
    output.on('error', err => {
      log(`ERROR in output stream: ${err.message}`);
      reject(err);
    });
    
    // Listen for archive warnings
    archive.on('warning', err => {
      if (err.code === 'ENOENT') {
        log(`WARNING: ${err.message}`);
      } else {
        log(`ERROR in archive: ${err.message}`);
        reject(err);
      }
    });
    
    // Listen for archive errors
    archive.on('error', err => {
      log(`ERROR in archive: ${err.message}`);
      reject(err);
    });
    
    // The 'close' event is fired once the file write stream is closed
    output.on('close', () => {
      const finalSize = archive.pointer();
      log(`ZIP creation complete. Size: ${finalSize} bytes`);
      
      // Verify the file exists and has content
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        log(`ZIP file successfully created at: ${outputPath}`);
        resolve(outputPath);
      } else {
        log('ERROR: ZIP file not created or empty');
        reject(new Error('ZIP file was not created successfully'));
      }
    });
    
    // Pipe archive data to the output file
    archive.pipe(output);
    
    // Add files to the archive
    log('Adding files to archive:');
    files.forEach(file => {
      const filePath = path.join(dataDir, file);
      try {
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        log(`- Adding ${file} (${fileSize} bytes)`);
        archive.file(filePath, { name: file });
      } catch (err) {
        log(`WARNING: Error processing file ${file}: ${err.message}`);
        // Continue with other files
      }
    });
    
    // Finalize the archive
    log('Finalizing archive...');
    archive.finalize();
    
    log('Archive finalization initiated - waiting for completion');
  });
}

// Run the function when this script is executed directly
log('Script started');
createZip()
  .then(zipPath => {
    if (zipPath) {
      log(`SUCCESS: ZIP file created at ${zipPath}`);
      process.exit(0);
    } else {
      log('FAILED: ZIP file was not created');
      process.exit(1);
    }
  })
  .catch(err => {
    log(`FATAL ERROR: ${err.message}`);
    if (err.stack) log(`Stack trace: ${err.stack}`);
    process.exit(1);
  });

export default createZip;