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
  
  // Ensure the log directory exists
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (e) {
      console.error(`Failed to create log directory: ${e.message}`);
    }
  }
  
  // Write to log file
  try {
    fs.appendFileSync(path.join(logDir, 'zip-creation.log'), logMsg + '\n');
  } catch (e) {
    console.error(`Failed to write to log file: ${e.message}`);
  }
}

/**
 * Create a ZIP file from the data directory
 */
async function createZip() {
  log('Starting ZIP creation process');
  
  // Define paths
  const dataDir = path.resolve(__dirname, '../public/data');
  const outputDir = path.resolve(__dirname, '../public/download');
  const outputPath = path.join(outputDir, 'gapmap-data.zip');
  
  log(`Data directory: ${dataDir}`);
  log(`Output directory: ${outputDir}`);
  log(`Output file: ${outputPath}`);
  
  // Verify data directory exists
  if (!fs.existsSync(dataDir)) {
    log(`ERROR: Data directory not found: ${dataDir}`);
    return null;
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
      const fileSize = fs.statSync(filePath).size;
      
      log(`- Adding ${file} (${fileSize} bytes)`);
      archive.file(filePath, { name: file });
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