// scripts/diagnose.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Basic logging function
function log(message) {
  console.log(`[DIAG] ${message}`);
}

// Attempt to run a function and log any errors
async function tryRun(name, fn) {
  try {
    log(`Starting ${name}...`);
    await fn();
    log(`Completed ${name} successfully`);
  } catch (error) {
    log(`ERROR in ${name}: ${error.message}`);
    log(`Error stack: ${error.stack}`);
  }
}

// Main diagnostic function
async function runDiagnostics() {
  log('Starting diagnostics');
  
  // Test 1: Basic file system operations
  await tryRun('file system test', async () => {
    log('Testing basic file system operations');
    
    try {
      // Try to get __dirname equivalent in ESM
      log('Testing ES Module path resolution');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      log(`Current directory: ${__dirname}`);
      
      // Try to create a test directory
      const testDir = path.resolve(__dirname, '../test-output');
      log(`Creating test directory: ${testDir}`);
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      // Try to write a test file
      const testFile = path.join(testDir, 'test.txt');
      log(`Writing test file: ${testFile}`);
      fs.writeFileSync(testFile, 'Test content');
      log('File written successfully');
      
      // Try to read the test file
      log(`Reading test file: ${testFile}`);
      const content = fs.readFileSync(testFile, 'utf8');
      log(`File content: ${content}`);
    } catch (error) {
      log(`File system error: ${error.message}`);
      throw error;
    }
  });
  
  // Test 2: Try importing from notion.js
  await tryRun('import test', async () => {
    log('Testing imports from notion.js');
    try {
      log('About to import notion module');
      
      // First try with .js extension
      try {
        const notionModule = await import('../src/lib/notion.js');
        log('Successfully imported notion.js with .js extension');
        log(`Exported functions: ${Object.keys(notionModule).join(', ')}`);
      } catch (importError) {
        log(`Error importing with .js extension: ${importError.message}`);
        
        // Try without .js extension as fallback
        try {
          const notionModule = await import('../src/lib/notion');
          log('Successfully imported notion without .js extension');
          log(`Exported functions: ${Object.keys(notionModule).join(', ')}`);
        } catch (fallbackError) {
          log(`Error importing without extension: ${fallbackError.message}`);
          throw fallbackError;
        }
      }
    } catch (error) {
      log(`Import error: ${error.message}`);
      throw error;
    }
  });
  
  // Test 3: Try calling getAllData() but with error catching
  await tryRun('getAllData test', async () => {
    log('Testing getAllData function');
    try {
      log('About to import notion module');
      
      // Try different import approaches
      let notionModule;
      try {
        notionModule = await import('../src/lib/notion.js');
      } catch (error) {
        log(`Error importing with .js extension: ${error.message}`);
        notionModule = await import('../src/lib/notion');
      }
      
      log('Successfully imported notion module');
      
      if (typeof notionModule.getAllData !== 'function') {
        log(`ERROR: getAllData is not a function in the notion module`);
        log(`Module exports: ${Object.keys(notionModule).join(', ')}`);
        return;
      }
      
      log('About to call getAllData()');
      
      // Call with a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout calling getAllData')), 30000);
      });
      
      const dataPromise = notionModule.getAllData();
      
      const result = await Promise.race([dataPromise, timeoutPromise]);
      
      log('getAllData completed successfully');
      log(`Data categories: ${Object.keys(result).join(', ')}`);
      log(`Found ${result.bottlenecks?.length || 0} gaps`);
      log(`Found ${result.foundationalCapabilities?.length || 0} capabilities`);
    } catch (error) {
      log(`getAllData error: ${error.message}`);
      throw error;
    }
  });
  
  log('Diagnostics completed');
}

// Run diagnostics
log('============== DIAGNOSTIC SCRIPT ==============');
runDiagnostics()
  .then(() => {
    log('All diagnostics complete');
  })
  .catch(error => {
    log(`Unhandled error: ${error.message}`);
    log(`Error stack: ${error.stack}`);
  });