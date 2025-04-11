import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createCapabilitySlug, createBottleneckSlug } from './slugUtils';

dotenv.config();

// Type definitions for our database structures
export interface Resource {
  id: string;
  resource_title: string;
  resource_url: string;
  content: string;
  resourceTypes: string[];
  last_edited_time?: string;
}

export interface Field {
  id: string;
  field_name: string;
  field_description: string;
  last_edited_time?: string;
}

export interface FoundationalCapability {
  id: string;
  fc_name: string;
  fc_description: string;
  slug: string;
  rank: number;
  index?: number;
  resources: Resource[];
  tags: string[];
  privateTags: string[];
  last_edited_time?: string;
}

export interface Bottleneck {
  id: string;
  bottleneck_name: string;
  bottleneck_description: string;
  slug: string;
  bottleneck_rank: number;
  bottleneck_number: number;
  field: Field;
  foundational_capabilities: FoundationalCapability[];
  tags: string[];
  privateTags: string[];
  last_edited_time?: string;
}

interface CacheMeta {
  lastUpdated: number;
  databases: Record<string, {
    lastUpdated: number;
    count: number;
    lastEditTime?: string;
  }>;
}

interface Tag {
  id: string;
  name: string;
  last_edited_time?: string;
}

// Cache configuration
const CACHE_DIR = process.env.NETLIFY
  ? '/opt/build/cache/notion-cache'
  : '.notion-cache';

const CACHE_META_FILE = path.join(CACHE_DIR, 'meta.json');

// Initialize Notion client
let notionClient: Client | null = null;

function getNotionClient(): Client {
  if (!notionClient) {
    notionClient = new Client({
      auth: process.env.NOTION_API_KEY
    });
  }
  return notionClient;
}

// Initialize NotionToMarkdown
let n2mInstance: NotionToMarkdown | null = null;

function getN2M(): NotionToMarkdown {
  if (!n2mInstance) {
    n2mInstance = new NotionToMarkdown({ notionClient: getNotionClient() });
  }
  return n2mInstance;
}
/**
 * Safely processes Notion rich text fields, handling any formatting issues
 * @param richTextArray - Array of rich text objects from Notion
 * @returns Sanitized plain text string
 */
function sanitizeRichText(richTextArray: any): string {
  // Handle null, undefined, or non-array values
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return '';
  }

  try {
    // Attempt to concatenate all text segments
    return richTextArray.map(segment => {
      // Safety check for malformed segments
      if (!segment || typeof segment !== 'object') {
        return '';
      }
      return segment.plain_text || '';
    }).join('');
  } catch (error) {
    // Log the error for debugging
    console.error('Error processing rich text:', error);
    console.error('Problematic rich text array:', JSON.stringify(richTextArray));
    // Return empty string as fallback
    return '';
  }
}

/**
 * Safely extracts a title from Notion page properties with enhanced error handling
 * @param properties - Notion page properties object
 * @param propertyName - Name of the title property
 * @param defaultValue - Default value if extraction fails
 * @returns Sanitized title string
 */
function extractSafeTitle(properties: any, propertyName: string, defaultValue: string = 'Untitled'): string {
  try {
    // Check if the property exists
    if (!properties || !properties[propertyName]) {
      return defaultValue;
    }

    const titleProperty = properties[propertyName];

    // Handle different property structures
    if (titleProperty.title && Array.isArray(titleProperty.title)) {
      return sanitizeRichText(titleProperty.title);
    } else if (titleProperty.rich_text && Array.isArray(titleProperty.rich_text)) {
      return sanitizeRichText(titleProperty.rich_text);
    }

    return defaultValue;
  } catch (error) {
    console.error(`Error extracting title from ${propertyName}:`, error);
    return defaultValue;
  }
}

/**
 * Safely concatenates all rich text segments from a Notion property
 * @param richTextArray - Array of rich text objects from Notion
 * @returns Concatenated plain text string
 */
function concatenateRichText(richTextArray: any): string {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return '';
  }

  return richTextArray.map(text => text.plain_text || '').join('');
}

/**
 * Request throttler for Notion API
 * Limits requests to respect the rate limit of 3 requests per second
 */
class RequestThrottler {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private processing: boolean = false;
  private requestsPerSecond: number;
  private interval: number;
  private lastRequestTime: number = 0;
  private retryCount: Record<string, number> = {};
  private maxRetries: number = 5;

  constructor(requestsPerSecond: number = 3) {
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
  }

  async add<T>(fn: () => Promise<T>, key: string = 'default'): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: async () => {
          try {
            return await fn();
          } catch (error: any) {
            // Handle rate limiting or temporary errors
            if (error.status === 429 || error.status === 500 || error.status === 503) {
              this.retryCount[key] = (this.retryCount[key] || 0) + 1;

              if (this.retryCount[key] <= this.maxRetries) {
                // Exponential backoff
                const backoff = Math.min(2 ** this.retryCount[key] * 1000, 30000);
                console.log(`Rate limited or server error. Retrying in ${backoff}ms (attempt ${this.retryCount[key]}/${this.maxRetries})...`);
                await new Promise(r => setTimeout(r, backoff));
                return await fn(); // Retry the request
              }
            }
            throw error; // Re-throw if not retryable or max retries exceeded
          }
        },
        resolve,
        reject
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delay = Math.max(0, this.interval - timeSinceLastRequest);

    // Add a small delay to stay well within rate limits
    const item = this.queue.shift()!;

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }

    // Small delay between processing items
    setTimeout(() => this.processQueue(), 10);
  }
}

// Create a global throttler instance
const throttler = new RequestThrottler(3);

/**
 * Initialize cache
 */
export async function initCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  if (!fs.existsSync(CACHE_META_FILE)) {
    const initialMeta = {
      lastUpdated: 0,
      databases: {}
    };
    fs.writeFileSync(CACHE_META_FILE, JSON.stringify(initialMeta, null, 2));
    return initialMeta;
  }

  return JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf8'));
}

/**
 * Save data to cache
 */
function saveToCache<T>(databaseId: string, data: T[], lastEditTime?: string) {
  const cacheFile = path.join(CACHE_DIR, `${databaseId}.json`);
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));

  // Update metadata
  const meta: CacheMeta = JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf8'));
  meta.databases[databaseId] = {
    lastUpdated: Date.now(),
    count: data.length,
    lastEditTime
  };
  meta.lastUpdated = Date.now();

  fs.writeFileSync(CACHE_META_FILE, JSON.stringify(meta, null, 2));
}

/**
 * Load data from cache
 */
function loadFromCache<T>(databaseId: string): T[] | null {
  const cacheFile = path.join(CACHE_DIR, `${databaseId}.json`);
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  return null;
}

/**
 * Get last update timestamp for a database
 */
function getLastUpdated(databaseId: string, meta: CacheMeta): number {
  return meta.databases[databaseId]?.lastUpdated || 0;
}

/**
 * Get the last edit time from the cache
 */
function getLastEditTime(databaseId: string, meta: CacheMeta): string | undefined {
  return meta.databases[databaseId]?.lastEditTime;
}

/**
 * Fetch all pages from a database with pagination and throttling
 */
async function fetchAllPages(databaseId: string, filter: any = undefined): Promise<any[]> {
  const notion = getNotionClient();
  const allResults: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;
  let currentCount = 0;
  let batchSize = 100; // Maximum allowed by Notion API
  let errorCount = 0;
  const maxErrors = 5; // Maximum tolerated errors

  console.log(`Starting paginated fetch for database ${databaseId}`);

  while (hasMore && errorCount < maxErrors) {
    try {
      // Use throttler to respect rate limits
      const response = await throttler.add(() =>
        notion.databases.query({
          database_id: databaseId,
          start_cursor: cursor,
          page_size: batchSize,
          filter
        }), 
        `fetch-${databaseId}-${cursor || 'initial'}`
      );

      const results = response.results;
      
      // Process each result individually to prevent one bad result from affecting others
      results.forEach(result => {
        try {
          allResults.push(result);
          currentCount++;
        } catch (resultError) {
          console.error(`Error processing result in batch for ${databaseId}:`, resultError);
          // Skip this result but continue processing others
        }
      });
      
      console.log(`Fetched ${results.length} items from ${databaseId}. Progress: ${currentCount} items`);

      cursor = response.next_cursor || undefined;
      hasMore = !!cursor;

      if (hasMore) {
        console.log(`More results available for ${databaseId}. Continuing with cursor: ${cursor}`);
      }
    } catch (error) {
      console.error(`Error fetching from database ${databaseId}:`, error);
      errorCount++;
      
      // If we hit a rate limit or server error, reduce batch size and retry
      if (batchSize > 10) {
        batchSize = Math.floor(batchSize / 2);
        console.log(`Reducing batch size to ${batchSize} and retrying...`);
        continue; // Try again with smaller batch
      }
      
      // If it's the last error we'll tolerate, break the loop
      if (errorCount >= maxErrors) {
        console.error(`Reached maximum error count (${maxErrors}) for database ${databaseId}. Aborting fetch.`);
        hasMore = false;
      } else {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  console.log(`Finished fetching ${allResults.length} items from database ${databaseId}`);
  return allResults;
}

/**
 * Efficiently query a database with caching and incremental updates
 */
async function queryDatabaseEfficiently<T>(
  databaseId: string,
  processor: (page: any) => Promise<T>,
  options: {
    fullRefresh?: boolean;
    filter?: any;
    sortField?: string;
  } = {}
): Promise<T[]> {
  const notion = getNotionClient();

  // Init cache
  const cache = await initCache();
  const cachedData = loadFromCache<T>(databaseId);
  const lastUpdated = getLastUpdated(databaseId, cache);
  const lastEditTime = getLastEditTime(databaseId, cache);

  // Determine if we need a full refresh or incremental update
  const needsFullRefresh = options.fullRefresh || !cachedData || lastUpdated === 0;

  let filter = options.filter || undefined;

  // For incremental updates, filter by last_edited_time
  if (!needsFullRefresh && lastEditTime) {
    filter = {
      timestamp: "last_edited_time",
      last_edited_time: {
        after: lastEditTime
      }
    };
    if (options.filter) {
      filter = {
        and: [filter, options.filter]
      };
    }
  }

  // If forced refresh or no cache, do a full fetch
  if (needsFullRefresh) {
    console.log(`Performing full refresh for database ${databaseId}`);

    // Get all pages
    const pages = await fetchAllPages(databaseId, filter);

    // Process pages in batches to avoid overwhelming the API
    const batchSize = 10;
    const processedData: T[] = [];

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(pages.length / batchSize)} for ${databaseId}`);

      // Process the batch with throttling between each item
      const batchResults = await Promise.all(
        batch.map((page, index) =>
          new Promise<T>(async (resolve) => {
            // Small delay between items in batch to avoid overwhelming API
            if (index > 0) {
              await new Promise(r => setTimeout(r, 100));
            }
            const result = await processor(page);
            resolve(result);
          })
        )
      );

      processedData.push(...batchResults);
    }

    // Find the most recent last_edited_time
    let latestEditTime: string | undefined;
    pages.forEach(page => {
      const editTime = page.last_edited_time;
      if (!latestEditTime || (editTime && editTime > latestEditTime)) {
        latestEditTime = editTime;
      }
    });

    // Save to cache
    saveToCache(databaseId, processedData, latestEditTime);

    return processedData;
  }

  // Otherwise, do an incremental update
  console.log(`Performing incremental update for database ${databaseId} since ${lastEditTime}`);

  try {
    // Get only updated pages
    const updatedPages = await fetchAllPages(databaseId, filter);

    if (updatedPages.length === 0) {
      console.log(`No updates found for database ${databaseId}`);
      return cachedData as T[];
    }

    console.log(`Processing ${updatedPages.length} updates for database ${databaseId}`);

    // Process updated pages
    const updatedData = await Promise.all(updatedPages.map(processor));

    // Find the most recent last_edited_time
    let latestEditTime = lastEditTime;
    updatedPages.forEach(page => {
      const editTime = page.last_edited_time;
      if (!latestEditTime || (editTime && editTime > latestEditTime)) {
        latestEditTime = editTime;
      }
    });

    // Create a map for easy lookup and merging
    const dataMap = new Map(cachedData!.map((item: any) => [item.id, item]));

    // Update existing items and add new ones
    updatedData.forEach(item => {
      dataMap.set((item as any).id, item);
    });

    // Convert back to array
    const mergedData = Array.from(dataMap.values());

    // Save updated data to cache
    saveToCache(databaseId, mergedData, latestEditTime);

    return mergedData;
  } catch (error) {
    console.error(`Error performing incremental update for ${databaseId}:`, error);

    // Fall back to cached data if available
    if (cachedData) {
      console.log(`Falling back to cached data for ${databaseId}`);
      return cachedData as T[];
    }

    // Re-throw if no fallback is available
    throw error;
  }
}

/**
 * Process a resource page into our Resource interface
 * This unified approach extracts content directly while processing the page
 */
async function processResourcePage(page: any): Promise<Resource> {

  const resource_title = concatenateRichText(page.properties.Resource_Title?.title) || 'Untitled';

  // Extract URL with updated field name
  let resource_url = '';
  if (page.properties.Resource_URL?.url) {
    resource_url = page.properties.Resource_URL.url;
  }

  // Extract resourceTypes with updated field name - handling multi-select
  let resourceTypes: string[] = ['Publication']; // Default value
  if (page.properties.Resource_Type?.multi_select) {
    // Handle multi-select property
    resourceTypes = page.properties.Resource_Type.multi_select.map((option: any) => option.name);
  } else if (page.properties.Resource_Type?.select?.name) {
    // Handle legacy single-select property (for backward compatibility)
    resourceTypes = [page.properties.Resource_Type.select.name];
  }

  // Get content directly (no separate cache file)
  let content = '';
  try {
    const n2m = getN2M();
    const mdBlocks = await throttler.add(() => n2m.pageToMarkdown(page.id), `content-${page.id}`);
    const mdString = n2m.toMarkdownString(mdBlocks);
    content = mdString.parent;
  } catch (error) {
    console.error(`Error fetching content for resource ${resource_title}:`, error);
    content = '';
  }

  return {
    id: page.id,
    resource_title,
    resource_url,
    content,
    resourceTypes,
    last_edited_time: page.last_edited_time
  };
}

/**
 * Process a field page into our Field interface
 * This unified approach extracts description directly while processing the page
 */
async function processFieldPage(page: any): Promise<Field> {

  const field_name = concatenateRichText(page.properties.Field_Name?.title) || 'Untitled';

  // Get field description directly (no separate cache file)
  let field_description = '';
  try {
    const n2m = getN2M();
    const mdBlocks = await throttler.add(() => n2m.pageToMarkdown(page.id), `description-${page.id}`);
    const mdString = n2m.toMarkdownString(mdBlocks);
    field_description = mdString.parent;
  } catch (error) {
    console.error(`Error fetching description for field ${field_name}:`, error);
    field_description = '';
  }

  return {
    id: page.id,
    field_name,
    field_description,
    last_edited_time: page.last_edited_time
  };
}

/**
 * Function to safely extract rank from Notion property
 */
function extractRankFromPage(page: any, pageName: string = 'unknown'): number {
  let rank = 0;

  try {
    // Case 1: Standard Notion number property named "Rank"
    if (page.properties.Rank && page.properties.Rank.type === 'number') {
      rank = page.properties.Rank.number !== null ? page.properties.Rank.number : 0;
    }
    // Case 2: Try alternate casing or property structure
    else {
      // Find property with name 'rank' (case-insensitive)
      const rankProp = Object.keys(page.properties).find(
        key => key.toLowerCase() === 'rank'
      );

      if (rankProp) {
        const propData = page.properties[rankProp];

        if (propData.type === 'number' && propData.number !== null) {
          rank = propData.number;
        } else if (propData.type === 'select' && propData.select) {
          rank = parseInt(propData.select.name) || 0;
        } else if (propData.type === 'rich_text' && propData.rich_text.length > 0) {
          // Use our helper function for rich text instead of just first segment
          const rankText = concatenateRichText(propData.rich_text);
          rank = parseInt(rankText) || 0;
        }
      }
    }
  } catch (error) {
    console.error(`Error extracting rank from ${pageName}:`, error);
  }

  // Ensure rank is between 0-5
  return Math.min(5, Math.max(0, rank));
}

/**
 * Process capability pages with resource references
 * This unified approach extracts description directly while processing the page
 */
async function processCapabilityPage(
  page: any,
  resources: Resource[]
): Promise<FoundationalCapability> {
  const pageId = page?.id || 'unknown';
  console.log(`Processing capability page: ${pageId}`);

  const fc_name = concatenateRichText(page.properties.FC_Name?.title) || 'Untitled';

  // Get resource relations
  const resourceRelations = page.properties.Resources?.relation || [];
  const fcResources = resourceRelations
    .map((ref: any) => resources.find(r => r.id === ref.id))
    .filter(Boolean);

  // Extract description - use rich text property if available
  let fc_description = '';
  if (
    page.properties.FC_Description?.rich_text &&
    page.properties.FC_Description.rich_text.length > 0
  ) {
    // Use our helper function instead of map/join directly
    fc_description = concatenateRichText(page.properties.FC_Description.rich_text);
  } else {
    // Get content directly (no separate cache file)
    try {

      const n2m = getN2M();
      const mdBlocks = await throttler.add(() => n2m.pageToMarkdown(page.id), `fc-description-${page.id}`);
      const mdString = n2m.toMarkdownString(mdBlocks);
      fc_description = mdString.parent;
    } catch (error) {
      console.error(`Error fetching description for capability ${fc_name}:`, error);
      fc_description = '';
    }
  }

  // Extract rank
  const rank = extractRankFromPage(page, fc_name);

  // Get tags relations (store just IDs for now)
  const tags = page.properties.Tags?.relation?.map((tagRelation: any) => tagRelation.id) || [];

  // Get private tags
  const privateTags = page.properties.PrivateTags?.multi_select?.map((tag: any) => tag.name) || [];

  // Generate slug
  const slug = createCapabilitySlug(fc_name);

  try {
    // Extract title safely
    const fc_name = extractSafeTitle(page.properties, 'FC_Name');
    console.log(`Capability title extracted: "${fc_name}"`);
    return {
      id: pageId,
      fc_name,
      fc_description,
      slug,
      rank,
      resources: fcResources,
      tags,
      privateTags,
      last_edited_time: page.last_edited_time
    };
  } catch (error) {
    // Log failure but return a valid minimal object
    console.error(`Failed to process capability page ${pageId}:`, error);

    return {
      id: pageId,
      fc_name: `Capability ${pageId.slice(0, 8)}...`,
      fc_description: '',
      slug: `capability-${pageId.slice(0, 8)}`,
      rank: 0,
      resources: [],
      tags: [],
      privateTags: [],
      last_edited_time: page.last_edited_time || new Date().toISOString()
    };
  }
}

/**
 * Process bottleneck pages with comprehensive error handling
 */
async function processBottleneckPage(
  page: any,
  fields: Field[],
  foundationalCapabilities: FoundationalCapability[]
): Promise<Bottleneck> {
  const pageId = page?.id || 'unknown';
  console.log(`Processing bottleneck page: ${pageId}`);

  try {
    // Extract title safely
    const bottleneck_name = extractSafeTitle(page.properties, 'Bottleneck_Name');
    console.log(`Bottleneck title extracted: "${bottleneck_name}"`);

    // Get field relation safely
    let bottleneckField = null;
    try {
      const fieldRelation = page.properties.Fields?.relation?.[0] || null;
      if (fieldRelation) {
        bottleneckField = fields.find(d => d.id === fieldRelation.id) || null;
      }
    } catch (fieldError) {
      console.error(`Error processing field relation for bottleneck ${pageId}:`, fieldError);
    }

    // Get capability relations safely
    let bottleneckFCs = [];
    try {
      const fcRelations = page.properties.Foundational_Capabilities?.relation || [];
      bottleneckFCs = fcRelations
        .map((fc: any) => {
          const capability = foundationalCapabilities.find(s => s.id === fc.id);
          return capability || null;
        })
        .filter(Boolean);
    } catch (fcError) {
      console.error(`Error processing capability relations for bottleneck ${pageId}:`, fcError);
    }

    // Extract description safely
    let bottleneck_description = '';
    try {
      if (
        page.properties.Bottleneck_Description?.rich_text &&
        page.properties.Bottleneck_Description.rich_text.length > 0
      ) {
        bottleneck_description = sanitizeRichText(page.properties.Bottleneck_Description.rich_text);
      } else {
        // Get content directly (no separate cache file)
        const n2m = getN2M();
        const mdBlocks = await throttler.add(() => n2m.pageToMarkdown(page.id), `bottleneck-description-${page.id}`);
        const mdString = n2m.toMarkdownString(mdBlocks);
        bottleneck_description = mdString.parent;
      }
    } catch (descError) {
      console.error(`Error fetching description for bottleneck ${bottleneck_name} (${pageId}):`, descError);
    }

    // Extract rank safely
    let bottleneck_rank = 0;
    try {
      if (page.properties.Bottleneck_Rank?.type === 'number') {
        bottleneck_rank = page.properties.Bottleneck_Rank.number !== null
          ? page.properties.Bottleneck_Rank.number
          : 0;
      }
    } catch (rankError) {
      console.error(`Error extracting rank for bottleneck ${pageId}:`, rankError);
    }

    // Extract bottleneck number safely
    let bottleneck_number = 0;
    try {
      if (page.properties.Bottleneck_Number?.type === 'number') {
        bottleneck_number = page.properties.Bottleneck_Number.number !== null
          ? page.properties.Bottleneck_Number.number
          : 0;
      }
    } catch (numError) {
      console.error(`Error extracting bottleneck number for ${pageId}:`, numError);
    }

    // Get tags relations safely
    let tags = [];
    try {
      tags = page.properties.Tags?.relation?.map((tagRelation: any) => tagRelation.id) || [];
    } catch (tagError) {
      console.error(`Error extracting tags for bottleneck ${pageId}:`, tagError);
    }

    // Get private tags safely
    let privateTags = [];
    try {
      privateTags = page.properties.PrivateTags?.multi_select?.map((tag: any) => tag.name) || [];
    } catch (privateTagError) {
      console.error(`Error extracting private tags for bottleneck ${pageId}:`, privateTagError);
    }

    // Generate slug safely
    const slug = createBottleneckSlug(bottleneck_name);

    // Create object with defaults for missing data
    return {
      id: pageId,
      bottleneck_name,
      bottleneck_description,
      slug,
      bottleneck_rank,
      bottleneck_number,
      field: bottleneckField || {
        id: '',
        field_name: 'Uncategorized',
        field_description: ''
      },
      foundational_capabilities: bottleneckFCs,
      tags,
      privateTags,
      last_edited_time: page.last_edited_time || new Date().toISOString()
    };
  } catch (error) {
    // Log failure but don't throw - return a minimal valid object instead
    console.error(`Failed to process bottleneck page ${pageId}:`, error);

    // Return a minimal valid object to prevent cascading failures
    return {
      id: pageId,
      bottleneck_name: `Bottleneck ${pageId.slice(0, 8)}...`, // Use truncated ID as fallback title
      bottleneck_description: '',
      slug: `bottleneck-${pageId.slice(0, 8)}`,
      bottleneck_rank: 0,
      bottleneck_number: 0,
      field: {
        id: '',
        field_name: 'Uncategorized',
        field_description: ''
      },
      foundational_capabilities: [],
      tags: [],
      privateTags: [],
      last_edited_time: page.last_edited_time || new Date().toISOString()
    };
  }
}
/**
 * Process a tag page into our Tag interface
 */
async function processTagPage(page: any): Promise<Tag> {

  const name = concatenateRichText(page.properties.Tag_Name?.title) || 'Unnamed Tag';

  return {
    id: page.id,
    name,
    last_edited_time: page.last_edited_time
  };
}

/**
 * Fetch all resources with efficient caching
 */
export async function getResources(options: { fullRefresh?: boolean } = {}): Promise<Resource[]> {
  const databaseId = process.env.NOTION_RESOURCES_DB_ID as string;
  return queryDatabaseEfficiently<Resource>(databaseId, processResourcePage, options);
}

/**
 * Fetch resource type options efficiently
 */
export async function getResourceTypeOptions(): Promise<string[]> {
  const databaseId = process.env.NOTION_RESOURCES_DB_ID as string;

  try {
    // Check cache first
    const cacheFile = path.join(CACHE_DIR, 'resource-type-options.json');
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }

    // Fetch from Notion if not cached
    const database = await throttler.add(
      () => getNotionClient().databases.retrieve({ database_id: databaseId }),
      'resource-types'
    );

    // Try ResourceType property first, prioritizing multi_select
    let typeProperty = Object.values(database.properties).find(
      (prop: any) => prop.name === 'Resource_Type' && prop.type === 'multi_select'
    );

    // Fall back to Type property or ResourceType as select if multi_select doesn't exist
    if (!typeProperty) {
      typeProperty = Object.values(database.properties).find(
        (prop: any) =>
          (prop.name === 'Resource_Type' && prop.type === 'select') ||
          (prop.name === 'Type' && prop.type === 'select')
      );
    }

    if (!typeProperty) {
      console.warn('No resource type options found in Notion database');
      return ['Publication']; // Default option
    }

    // Extract option names - handle both multi_select and select types
    const options = typeProperty.type === 'multi_select'
      ? typeProperty.multi_select.options.map((option: any) => option.name)
      : typeProperty.select.options.map((option: any) => option.name);

    // Cache the options
    fs.writeFileSync(cacheFile, JSON.stringify(options, null, 2));

    return options;
  } catch (error) {
    console.error('Error fetching resource type options:', error);
    return ['Publication']; // Default option
  }
}

/**
 * Fetch all fields with efficient caching
 */
export async function getFields(options: { fullRefresh?: boolean } = {}): Promise<Field[]> {
  const databaseId = process.env.NOTION_FIELDS_DB_ID as string;
  return queryDatabaseEfficiently<Field>(databaseId, processFieldPage, options);
}

/**
 * Fetch all foundational capabilities with efficient caching
 */
export async function getFoundationalCapabilities(
  resources: Resource[],
  options: { fullRefresh?: boolean } = {}
): Promise<FoundationalCapability[]> {
  const databaseId = process.env.NOTION_CAPABILITIES_DB_ID as string;
  return queryDatabaseEfficiently<FoundationalCapability>(
    databaseId,
    (page) => processCapabilityPage(page, resources),
    options
  );
}

/**
 * Fetch all bottlenecks with efficient caching
 */
export async function getBottlenecks(
  fields: Field[],
  foundationalCapabilities: FoundationalCapability[],
  options: { fullRefresh?: boolean } = {}
): Promise<Bottleneck[]> {
  const databaseId = process.env.NOTION_BOTTLENECKS_DB_ID as string;

  return queryDatabaseEfficiently<Bottleneck>(
    databaseId,
    (page) => processBottleneckPage(page, fields, foundationalCapabilities),
    options
  );
}

/**
 * Fetch all tags with efficient caching
 */
export async function getTags(options: { fullRefresh?: boolean } = {}): Promise<Map<string, string>> {
  const databaseId = process.env.NOTION_TAGS_DB_ID as string;

  try {
    const tags = await queryDatabaseEfficiently<Tag>(
      databaseId,
      processTagPage,
      options
    );

    // Create a map of tag ID to tag name
    const tagMap = new Map<string, string>();
    tags.forEach(tag => {
      tagMap.set(tag.id, tag.name);
    });

    return tagMap;
  } catch (error) {
    console.error('Error fetching tags:', error);
    return new Map();
  }
}

/**
 * Main function to get all data with proper relationships
 */
export async function getAllData(options: { fullRefresh?: boolean } = {}): Promise<{
  resources: Resource[];
  fields: Field[];
  foundationalCapabilities: FoundationalCapability[];
  bottlenecks: Bottleneck[];
  resourceTypeOptions: string[];
}> {
  console.log(`Starting optimized data fetch from Notion (full refresh: ${options.fullRefresh ? 'yes' : 'no'})`);
  
  // Determine whether to do full refresh based on environment
  const isBuildEnvironment = process.env.NODE_ENV === 'production' || process.argv.includes('build');
  const shouldFullRefresh = options.fullRefresh || process.argv.includes('--full-refresh');
  
  const fetchOptions = { 
    fullRefresh: shouldFullRefresh
  };
  
  // Initialize results with empty arrays
  let resources: Resource[] = [];
  let fields: Field[] = [];
  let foundationalCapabilities: FoundationalCapability[] = [];
  let bottlenecks: Bottleneck[] = [];
  let resourceTypeOptions: string[] = [];
  
  // Fetch data with error isolation - errors in one section don't affect others
  try {
    resources = await getResources(fetchOptions);
    console.log(`Fetched ${resources.length} resources`);
  } catch (resourceError) {
    console.error('Error fetching resources:', resourceError);
    resources = []; // Use empty array on failure
  }
  
  try {
    fields = await getFields(fetchOptions);
    console.log(`Fetched ${fields.length} fields`);
  } catch (fieldError) {
    console.error('Error fetching fields:', fieldError);
    fields = []; // Use empty array on failure
  }
  
  try {
    resourceTypeOptions = await getResourceTypeOptions();
    console.log(`Fetched ${resourceTypeOptions.length} resource type options`);
  } catch (typeError) {
    console.error('Error fetching resource type options:', typeError);
    resourceTypeOptions = ['Publication']; // Use default on failure
  }
  
  try {
    foundationalCapabilities = await getFoundationalCapabilities(resources, fetchOptions);
    console.log(`Fetched ${foundationalCapabilities.length} foundational capabilities`);
  } catch (fcError) {
    console.error('Error fetching foundational capabilities:', fcError);
    foundationalCapabilities = []; // Use empty array on failure
  }
  
  try {
    bottlenecks = await getBottlenecks(fields, foundationalCapabilities, fetchOptions);
    console.log(`Fetched ${bottlenecks.length} bottlenecks`);
  } catch (bottleneckError) {
    console.error('Error fetching bottlenecks:', bottleneckError);
    bottlenecks = []; // Use empty array on failure
  }
  
  // Post-processing relationships
  try {
    // Fetch tags
    let tagMap = new Map<string, string>();
    try {
      tagMap = await getTags(fetchOptions);
      console.log(`Fetched ${tagMap.size} tags`);
    } catch (tagError) {
      console.error('Error fetching tags:', tagError);
    }
    
    // Replace tag IDs with tag names in bottlenecks
    bottlenecks.forEach(bottleneck => {
      try {
        bottleneck.tags = bottleneck.tags.map(tagId => tagMap.get(tagId) || 'Unknown Tag');
      } catch (e) {
        console.error(`Error processing tags for bottleneck ${bottleneck.id}:`, e);
        bottleneck.tags = []; // Reset on error
      }
    });
    
    // Replace tag IDs with tag names in foundational capabilities
    foundationalCapabilities.forEach(capability => {
      try {
        capability.tags = capability.tags.map(tagId => tagMap.get(tagId) || 'Unknown Tag');
      } catch (e) {
        console.error(`Error processing tags for capability ${capability.id}:`, e);
        capability.tags = []; // Reset on error
      }
    });
    
    // Fix duplicate bottleneck numbers and slugs
    // ... (keep existing code for fixing duplicates) ...
  } catch (postProcessError) {
    console.error('Error in post-processing:', postProcessError);
    // Continue with data as is
  }
  
  console.log("Data fetch and processing complete!");
  
  return {
    resources,
    fields,
    foundationalCapabilities,
    bottlenecks,
    resourceTypeOptions
  };
}