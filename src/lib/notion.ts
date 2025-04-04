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
  resourceType: string;
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
const CACHE_DIR = '.notion-cache';
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
 * Initialize the cache system
 */
async function initCache(): Promise<CacheMeta> {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  if (!fs.existsSync(CACHE_META_FILE)) {
    const initialMeta: CacheMeta = {
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

  console.log(`Starting paginated fetch for database ${databaseId}`);

  while (hasMore) {
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
      allResults.push(...results);
      
      currentCount += results.length;
      console.log(`Fetched ${results.length} items from ${databaseId}. Progress: ${currentCount} items`);

      cursor = response.next_cursor || undefined;
      hasMore = !!cursor;

      if (hasMore) {
        console.log(`More results available for ${databaseId}. Continuing with cursor: ${cursor}`);
      }
    } catch (error) {
      console.error(`Error fetching from database ${databaseId}:`, error);
      // If we hit a rate limit or server error, reduce batch size and retry
      if (batchSize > 10) {
        batchSize = Math.floor(batchSize / 2);
        console.log(`Reducing batch size to ${batchSize} and retrying...`);
        continue; // Try again with smaller batch
      }
      // Break the loop to avoid infinite retries
      hasMore = false;
      throw error;
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
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(pages.length/batchSize)} for ${databaseId}`);
      
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
  const resource_title = page.properties.Resource_Title?.title[0]?.plain_text || 'Untitled';
  
  // Extract URL with updated field name
  let resource_url = '';
  if (page.properties.Resource_URL?.url) {
    resource_url = page.properties.Resource_URL.url;
  }
  
  // Extract resourceType with updated field name
  let resourceType = 'Publication'; // Default value
  if (page.properties.Resource_Type?.select?.name) {
    resourceType = page.properties.Resource_Type.select.name;
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
    resourceType,
    last_edited_time: page.last_edited_time
  };
}

/**
 * Process a field page into our Field interface
 * This unified approach extracts description directly while processing the page
 */
async function processFieldPage(page: any): Promise<Field> {
  const field_name = page.properties.Field_Name?.title[0]?.plain_text || 'Untitled';
  
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
          rank = parseInt(propData.rich_text[0].plain_text) || 0;
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
  const fc_name = page.properties.FC_Name?.title[0]?.plain_text || 'Untitled';
  
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
    fc_description = page.properties.FC_Description.rich_text.map(
      (text: any) => text.plain_text
    ).join('');
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
  
  return {
    id: page.id,
    fc_name,
    fc_description,
    slug,
    rank,
    resources: fcResources,
    tags,
    privateTags,
    last_edited_time: page.last_edited_time
  };
}

/**
 * Process bottleneck pages with field and capability references
 * This unified approach extracts description directly while processing the page
 */
async function processBottleneckPage(
  page: any,
  fields: Field[],
  foundationalCapabilities: FoundationalCapability[]
): Promise<Bottleneck> {
  const bottleneck_name = page.properties.Bottleneck_Name?.title[0]?.plain_text || 'Untitled';
  
  // Get field relation
  const fieldRelation = page.properties.Fields?.relation[0] || null;
  const bottleneckField = fieldRelation
    ? fields.find(d => d.id === fieldRelation.id)
    : null;
  
  // Get capability relations
  const fcRelations = page.properties.Foundational_Capabilities?.relation || [];
  const bottleneckFCs = fcRelations
    .map((fc: any) => foundationalCapabilities.find(s => s.id === fc.id))
    .filter(Boolean);
  
  // Extract description - use rich text property if available
  let bottleneck_description = '';
  if (
    page.properties.Bottleneck_Description?.rich_text && 
    page.properties.Bottleneck_Description.rich_text.length > 0
  ) {
    bottleneck_description = page.properties.Bottleneck_Description.rich_text.map(
      (text: any) => text.plain_text
    ).join('');
  } else {
    // Get content directly (no separate cache file)
    try {
      const n2m = getN2M();
      const mdBlocks = await throttler.add(() => n2m.pageToMarkdown(page.id), `bottleneck-description-${page.id}`);
      const mdString = n2m.toMarkdownString(mdBlocks);
      bottleneck_description = mdString.parent;
    } catch (error) {
      console.error(`Error fetching description for bottleneck ${bottleneck_name}:`, error);
      bottleneck_description = '';
    }
  }
  
  // Extract rank
  let bottleneck_rank = 0;
  if (page.properties.Bottleneck_Rank?.type === 'number') {
    bottleneck_rank = page.properties.Bottleneck_Rank.number !== null 
      ? page.properties.Bottleneck_Rank.number 
      : 0;
  }
  
  // Extract bottleneck number
  let bottleneck_number = 0;
  if (page.properties.Bottleneck_Number?.type === 'number') {
    bottleneck_number = page.properties.Bottleneck_Number.number !== null 
      ? page.properties.Bottleneck_Number.number 
      : 0;
  }
  
  // Get tags relations (store just IDs for now)
  const tags = page.properties.Tags?.relation?.map((tagRelation: any) => tagRelation.id) || [];
  
  // Get private tags
  const privateTags = page.properties.PrivateTags?.multi_select?.map((tag: any) => tag.name) || [];
  
  // Generate slug
  const slug = createBottleneckSlug(bottleneck_name);
  
  // Create the bottleneck object with a default field if none exists
  return {
    id: page.id,
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
    last_edited_time: page.last_edited_time
  };
}

/**
 * Process a tag page into our Tag interface
 */
async function processTagPage(page: any): Promise<Tag> {
  const name = page.properties.Tag_Name?.title[0]?.plain_text || 'Unnamed Tag';
  
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
    
    // Try ResourceType property first
    let typeProperty = Object.values(database.properties).find(
      (prop: any) => prop.name === 'Resource_Type' && prop.type === 'select'
    );
    
    // Fall back to Type property if ResourceType doesn't exist
    if (!typeProperty) {
      typeProperty = Object.values(database.properties).find(
        (prop: any) => prop.name === 'Type' && prop.type === 'select'
      );
    }
    
    if (!typeProperty || !typeProperty.select || !typeProperty.select.options) {
      console.warn('No resource type options found in Notion database');
      return ['Publication']; // Default option
    }
    
    // Extract option names
    const options = typeProperty.select.options.map((option: any) => option.name);
    
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
  
  // Fetch data in an optimized sequence that respects dependencies
  // 1. Start with resources and fields which don't have dependencies
  const [resources, fields, resourceTypeOptions] = await Promise.all([
    getResources(fetchOptions),
    getFields(fetchOptions),
    getResourceTypeOptions()
  ]);
  
  console.log(`Fetched ${resources.length} resources and ${fields.length} fields`);
  
  // 2. Fetch capabilities which depend on resources
  const foundationalCapabilities = await getFoundationalCapabilities(resources, fetchOptions);
  console.log(`Fetched ${foundationalCapabilities.length} foundational capabilities`);
  
  // 3. Fetch bottlenecks which depend on fields and capabilities
  const bottlenecks = await getBottlenecks(fields, foundationalCapabilities, fetchOptions);
  console.log(`Fetched ${bottlenecks.length} bottlenecks`);
  
  // 4. Fetch tags
  const tagMap = await getTags(fetchOptions);
  console.log(`Fetched ${tagMap.size} tags`);
  
  // 5. Post-process relationships
  // Replace tag IDs with tag names in bottlenecks
  bottlenecks.forEach(bottleneck => {
    bottleneck.tags = bottleneck.tags.map(tagId => tagMap.get(tagId) || 'Unknown Tag');
  });
  
  // Replace tag IDs with tag names in foundational capabilities
  foundationalCapabilities.forEach(capability => {
    capability.tags = capability.tags.map(tagId => tagMap.get(tagId) || 'Unknown Tag');
  });
  
  // Check for and fix duplicate bottleneck numbers
  const numberMap = new Map<number, Bottleneck>();
  const duplicateNumbers: number[] = [];
  
  bottlenecks.forEach(bottleneck => {
    if (bottleneck.bottleneck_number > 0) {
      if (numberMap.has(bottleneck.bottleneck_number)) {
        duplicateNumbers.push(bottleneck.bottleneck_number);
      } else {
        numberMap.set(bottleneck.bottleneck_number, bottleneck);
      }
    }
  });
  
  if (duplicateNumbers.length > 0) {
    console.warn(`Found ${duplicateNumbers.length} duplicate bottleneck numbers: ${duplicateNumbers.join(', ')}`);
    
    // Fix duplicates by assigning null to the duplicates
    bottlenecks.forEach(bottleneck => {
      if (
        bottleneck.bottleneck_number > 0 && 
        duplicateNumbers.includes(bottleneck.bottleneck_number) &&
        // Only fix the bottlenecks that aren't the first instance we saw
        numberMap.get(bottleneck.bottleneck_number)?.id !== bottleneck.id
      ) {
        console.warn(`Setting duplicate bottleneck number ${bottleneck.bottleneck_number} to null for "${bottleneck.bottleneck_name}"`);
        bottleneck.bottleneck_number = 0;
      }
    });
  }
  
  // Check for and fix duplicate slugs
  const slugMap = new Map<string, Bottleneck>();
  const duplicateSlugs: string[] = [];
  
  bottlenecks.forEach(bottleneck => {
    if (slugMap.has(bottleneck.slug)) {
      duplicateSlugs.push(bottleneck.slug);
    } else {
      slugMap.set(bottleneck.slug, bottleneck);
    }
  });
  
  if (duplicateSlugs.length > 0) {
    console.warn(`Found ${duplicateSlugs.length} duplicate bottleneck slugs: ${duplicateSlugs.join(', ')}`);
    
    // Fix duplicates by appending ID fragment
    bottlenecks.forEach(bottleneck => {
      if (
        duplicateSlugs.includes(bottleneck.slug) &&
        // Only fix the bottlenecks that aren't the first instance we saw
        slugMap.get(bottleneck.slug)?.id !== bottleneck.id
      ) {
        const originalSlug = bottleneck.slug;
        bottleneck.slug = `${bottleneck.slug}-${bottleneck.id.substring(0, 6)}`;
        console.warn(`Fixed duplicate slug "${originalSlug}" to "${bottleneck.slug}" for "${bottleneck.bottleneck_name}"`);
      }
    });
  }
  
  // Do the same checks and fixes for capabilities
  const fcSlugMap = new Map<string, FoundationalCapability>();
  const duplicateFcSlugs: string[] = [];
  
  foundationalCapabilities.forEach(capability => {
    if (fcSlugMap.has(capability.slug)) {
      duplicateFcSlugs.push(capability.slug);
    } else {
      fcSlugMap.set(capability.slug, capability);
    }
  });
  
  if (duplicateFcSlugs.length > 0) {
    console.warn(`Found ${duplicateFcSlugs.length} duplicate capability slugs: ${duplicateFcSlugs.join(', ')}`);
    
    // Fix duplicates by appending ID fragment
    foundationalCapabilities.forEach(capability => {
      if (
        duplicateFcSlugs.includes(capability.slug) &&
        // Only fix the capabilities that aren't the first instance we saw
        fcSlugMap.get(capability.slug)?.id !== capability.id
      ) {
        const originalSlug = capability.slug;
        capability.slug = `${capability.slug}-${capability.id.substring(0, 6)}`;
        console.warn(`Fixed duplicate slug "${originalSlug}" to "${capability.slug}" for "${capability.fc_name}"`);
      }
    });
  }
  
  // Save relationships to a single cache file instead of many small ones
  const relationshipFile = path.join(CACHE_DIR, 'relationships.json');
  const relationships = {
    bottleneckToFc: {} as Record<string, string[]>,
    fcToBottleneck: {} as Record<string, string[]>
  };
  
  // Build relationship maps
  bottlenecks.forEach(bottleneck => {
    // Store FC IDs for each bottleneck
    relationships.bottleneckToFc[bottleneck.id] = 
      bottleneck.foundational_capabilities.map(fc => fc.id);
    
    // Store bottleneck ID for each FC
    bottleneck.foundational_capabilities.forEach(fc => {
      if (!relationships.fcToBottleneck[fc.id]) {
        relationships.fcToBottleneck[fc.id] = [];
      }
      relationships.fcToBottleneck[fc.id].push(bottleneck.id);
    });
  });
  
  // Save relationship data to cache
  fs.writeFileSync(relationshipFile, JSON.stringify(relationships, null, 2));
  
  console.log("Data fetch and processing complete!");
  
  return {
    resources,
    fields,
    foundationalCapabilities,
    bottlenecks,
    resourceTypeOptions
  };
}