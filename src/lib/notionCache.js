// src/lib/notionCache.js
import fs from 'fs';
import path from 'path';

// Cache directory configuration
const CACHE_DIR = '.notion-cache';
const CACHE_META_FILE = path.join(CACHE_DIR, 'meta.json');

// Initialize cache
export async function initCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(CACHE_META_FILE)) {
    fs.writeFileSync(CACHE_META_FILE, JSON.stringify({
      lastUpdated: 0,
      databases: {}
    }));
  }
  
  return JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf8'));
}

// Save data to cache
export function saveToCache(databaseId, data) {
  const cacheFile = path.join(CACHE_DIR, `${databaseId}.json`);
  fs.writeFileSync(cacheFile, JSON.stringify(data));
  
  // Update metadata
  const meta = JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf8'));
  meta.databases[databaseId] = {
    lastUpdated: Date.now(),
    count: data.length
  };
  meta.lastUpdated = Date.now();
  
  fs.writeFileSync(CACHE_META_FILE, JSON.stringify(meta));
}

// Load data from cache
export function loadFromCache(databaseId) {
  const cacheFile = path.join(CACHE_DIR, `${databaseId}.json`);
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  return null;
}

// Get last updated timestamp for a database
export function getLastUpdated(databaseId, meta) {
  return meta.databases[databaseId]?.lastUpdated || 0;
}