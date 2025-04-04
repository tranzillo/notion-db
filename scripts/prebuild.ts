// scripts/prebuild.ts
import { getAllData } from '../src/lib/notion';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Main prebuild function
 */
async function prebuild() {
  console.log('================================');
  console.log('Starting Notion data prebuild...');
  console.log('================================');
  
  const startTime = Date.now();
  
  // Parse command line arguments
  const fullRefresh = process.argv.includes('--full-refresh');
  const clearCache = process.argv.includes('--clear-cache');
  
  // Clear cache if requested
  if (clearCache) {
    const cacheDir = '.notion-cache';
    console.log(`Clearing notion cache directory: ${cacheDir}`);
    
    if (fs.existsSync(cacheDir)) {
      // Delete all files in the directory
      fs.readdirSync(cacheDir).forEach(file => {
        const filePath = path.join(cacheDir, file);
        fs.unlinkSync(filePath);
      });
      
      // Try to remove the directory itself
      try {
        fs.rmdirSync(cacheDir);
        console.log('Cache directory successfully removed');
      } catch (e) {
        console.log('Could not remove cache directory, but cleared all its contents');
      }
    } else {
      console.log('Cache directory does not exist, nothing to clear');
    }
  }
  
  try {
    console.log(`Running prebuild with ${fullRefresh ? 'full refresh' : 'incremental update'}`);
    
    // Fetch all data from Notion
    await getAllData({ fullRefresh });
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`Prebuild completed successfully in ${duration.toFixed(2)}s`);
  } catch (error) {
    console.error('Error during prebuild:', error);
    process.exit(1);
  }
}

// Run the prebuild function
prebuild().catch(err => {
  console.error('Fatal error during prebuild:', err);
  process.exit(1);
});