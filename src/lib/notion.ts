import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const n2m = new NotionToMarkdown({ notionClient: notion });

// Type definitions for our database structures
export interface Resource {
  id: string;
  resource_title: string;
  resource_url: string;
  content: string;
  resourceType: string;
}

export interface Field {
  id: string;
  field_name: string;
  field_description: string;
}

export interface FoundationalCapability {
  id: string;
  fc_name: string;
  fc_description: string;
  slug: string;
  rank: number;
  index: number;
  resources: Resource[];
  tags: string[];
  privateTags: string[];
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
}

// Function to safely extract rank from Notion property
function extractRankFromPage(page: any, pageName: string = 'unknown') {
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

// Function to fetch and parse resources
export async function getResources(): Promise<Resource[]> {
  const databaseId = process.env.NOTION_RESOURCES_DB_ID as string;
  
  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      // Updated field names
      const resource_title = page.properties.Resource_Title.title[0]?.plain_text || 'Untitled';
      
      // Extract URL with updated field name
      let resource_url = '';
      
      if (page.properties.Resource_URL && page.properties.Resource_URL.url) {
        resource_url = page.properties.Resource_URL.url;
      }
      
      // Extract resourceType with updated field name
      let resourceType = 'Publication'; // Default value
      
      if (page.properties.Resource_Type && page.properties.Resource_Type.select) {
        resourceType = page.properties.Resource_Type.select.name || resourceType;
      }
      
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      return {
        id: page.id,
        resource_title,
        resource_url,
        content: content.parent,
        resourceType
      };
    })
  );
}
// Function to fetch resource type options as strings
export async function getResourceTypeOptions(): Promise<string[]> {
  const databaseId = process.env.NOTION_RESOURCES_DB_ID as string;
  
  try {
    // Fetch database information to get the select options
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });
    
    // First try ResourceType property
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
    
    // Extract just the option names
    return typeProperty.select.options.map((option: any) => option.name);
  } catch (error) {
    console.error('Error fetching resource type options:', error);
    return ['Publication']; // Default option
  }
}

// Function to fetch and parse disciplines
export async function getFields(): Promise<Field[]> {
  const databaseId = process.env.NOTION_FIELDS_DB_ID as string;

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      const field_name = page.properties.Field_Name.title[0]?.plain_text || 'Untitled';
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const field_description = n2m.toMarkdownString(mdBlocks);

      return {
        id: page.id,
        field_name,
        field_description: field_description.parent
      };
    })
  );
}

// Update the getFoundationalCapabilities function (previously getSolutions)
export async function getFoundationalCapabilities(resources: Resource[]): Promise<FoundationalCapability[]> {
  const databaseId = process.env.NOTION_CAPABILITIES_DB_ID as string;

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      const fc_name = page.properties.FC_Name.title[0]?.plain_text || 'Untitled';

      // Get the resource relations with updated field name
      const resourceRelations = page.properties.Resources?.relation || [];
      const fcResources = resourceRelations.map((ref: any) => {
        return resources.find(r => r.id === ref.id);
      }).filter(Boolean);

      // Extract fc_description directly from property
      let fc_description = '';
      if (page.properties.FC_Description && 
          page.properties.FC_Description.rich_text && 
          page.properties.FC_Description.rich_text.length > 0) {
        fc_description = page.properties.FC_Description.rich_text.map(
          (text: any) => text.plain_text
        ).join('');
      } else {
        // Fallback to page content if the property doesn't exist
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const content = n2m.toMarkdownString(mdBlocks);
        fc_description = content.parent;
      }

      // Extract rank
      const rank = extractRankFromPage(page, fc_name);

      // Extract tags (public) - now with relations
      let tags = [];
      if (page.properties.Tags && page.properties.Tags.relation) {
        // Store tag IDs for now
        tags = page.properties.Tags.relation.map((tagRelation: any) => tagRelation.id);
      }
      
      // Extract private tags
      let privateTags = [];
      if (page.properties.PrivateTags && page.properties.PrivateTags.multi_select) {
        privateTags = page.properties.PrivateTags.multi_select.map((tag: any) => tag.name);
      }

      // Generate slug if needed
      const slug = fc_name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');

      return {
        id: page.id,
        fc_name,
        fc_description,
        slug,
        rank,
        resources: fcResources,
        tags,
        privateTags
      };
    })
  );
}
// Function to fetch and parse bottlenecks with their disciplines and solutions
export async function getBottlenecks(
  fields: Field[],
  foundationalCapabilities: FoundationalCapability[]
): Promise<Bottleneck[]> {
  const databaseId = process.env.NOTION_BOTTLENECKS_DB_ID as string;
  
  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      const bottleneck_name = page.properties.Bottleneck_Name.title[0]?.plain_text || 'Untitled';

      // Get the field relation (previously discipline)
      const fieldRelation = page.properties.Fields?.relation[0] || null;
      const bottleneckField = fieldRelation
        ? fields.find(d => d.id === fieldRelation.id)
        : null;

      // Get the foundational capabilities relations (previously solutions)
      const fcRelations = page.properties.Foundational_Capabilities?.relation || [];
      const bottleneckFCs = fcRelations.map((fc: any) => {
        return foundationalCapabilities.find(s => s.id === fc.id);
      }).filter(Boolean);

      // Extract bottleneck description directly from property
      let bottleneck_description = '';
      if (page.properties.Bottleneck_Description && 
          page.properties.Bottleneck_Description.rich_text && 
          page.properties.Bottleneck_Description.rich_text.length > 0) {
        bottleneck_description = page.properties.Bottleneck_Description.rich_text.map(
          (text: any) => text.plain_text
        ).join('');
      } else {
        // Fallback to page content if the property doesn't exist
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const content = n2m.toMarkdownString(mdBlocks);
        bottleneck_description = content.parent;
      }

      // Extract rank with updated field name
      let bottleneck_rank = 0;
      try {
        if (page.properties.Bottleneck_Rank && page.properties.Bottleneck_Rank.type === 'number') {
          bottleneck_rank = page.properties.Bottleneck_Rank.number !== null ? page.properties.Bottleneck_Rank.number : 0;
        }
      } catch (error) {
        console.error(`Error extracting rank from ${bottleneck_name}:`, error);
      }
      
      // Extract bottleneck number (previously index)
      let bottleneck_number = 0;
      try {
        if (page.properties.Bottleneck_Number && page.properties.Bottleneck_Number.type === 'number') {
          bottleneck_number = page.properties.Bottleneck_Number.number !== null ? page.properties.Bottleneck_Number.number : 0;
        }
      } catch (error) {
        console.error(`Error extracting number from ${bottleneck_name}:`, error);
      }

      // Generate a slug from the name
      const slug = bottleneck_name.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');

      // Extract tags with updated relationship
      let tags = [];
      if (page.properties.Tags && page.properties.Tags.relation) {
        // We need to fetch each tag's name from the Tags database
        // For now, we'll just store the IDs and handle tag names later
        tags = page.properties.Tags.relation.map((tagRelation: any) => tagRelation.id);
      }
      
      // Extract private tags
      let privateTags = [];
      if (page.properties.PrivateTags && page.properties.PrivateTags.multi_select) {
        privateTags = page.properties.PrivateTags.multi_select.map((tag: any) => tag.name);
      }

      return {
        id: page.id,
        bottleneck_name,
        bottleneck_description,
        slug,
        bottleneck_rank,
        bottleneck_number,
        field: bottleneckField || { id: '', field_name: 'Uncategorized', field_description: '' },
        foundational_capabilities: bottleneckFCs,
        tags,
        privateTags
      };
    })
  );
}
export async function getTags(): Promise<Map<string, string>> {
  const databaseId = process.env.NOTION_TAGS_DB_ID as string;
  
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    
    // Create a map of tag ID to tag name
    const tagMap = new Map<string, string>();
    
    response.results.forEach((page: any) => {
      const tagName = page.properties.Tag_Name?.title[0]?.plain_text || 'Unnamed Tag';
      tagMap.set(page.id, tagName);
    });
    
    return tagMap;
  } catch (error) {
    console.error('Error fetching tags:', error);
    return new Map();
  }
}

// Update getAllData to include tags
export async function getAllData(): Promise<{
  resources: Resource[];
  fields: Field[];
  foundationalCapabilities: FoundationalCapability[];
  bottlenecks: Bottleneck[];
  resourceTypeOptions: string[];
}> {
  // Fetch data in order to maintain relationships
  const resources = await getResources();
  const fields = await getFields();
  const foundationalCapabilities = await getFoundationalCapabilities(resources);
  const bottlenecks = await getBottlenecks(fields, foundationalCapabilities);
  const resourceTypeOptions = await getResourceTypeOptions();
  
  // Get all tags
  const tagMap = await getTags();
  
  // Replace tag IDs with tag names in bottlenecks
  bottlenecks.forEach(bottleneck => {
    bottleneck.tags = bottleneck.tags.map(tagId => tagMap.get(tagId) || 'Unknown Tag');
  });
  
  // Replace tag IDs with tag names in foundational capabilities
  foundationalCapabilities.forEach(capability => {
    capability.tags = capability.tags.map(tagId => tagMap.get(tagId) || 'Unknown Tag');
  });

  return {
    resources,
    fields,
    foundationalCapabilities,
    bottlenecks,
    resourceTypeOptions
  };
}