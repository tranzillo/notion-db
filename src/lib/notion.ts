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
export interface Reference {
  id: string;
  title: string;
  url: string;
  content: string;
  type: string;
}

export interface Discipline {
  id: string;
  title: string;
  content: string;
}

export interface Solution {
  id: string;
  title: string;
  content: string;
  rank: number;
  references: Reference[];
}

export interface Bottleneck {
  id: string;
  title: string;
  content: string;
  slug: string;
  rank: number;
  discipline: Discipline;
  solutions: Solution[];
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

// Function to fetch and parse references
export async function getReferences(): Promise<Reference[]> {
  const databaseId = process.env.NOTION_REFERENCES_DB_ID as string;
  
  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      const title = page.properties.Title.title[0]?.plain_text || 'Untitled';
      
      // Extract URL - handle various formats (keep existing code)
      let url = '';
      
      // Try standard URL property
      if (page.properties.URL && page.properties.URL.url) {
        url = page.properties.URL.url;
      }
      // Also try 'Url' (capitalization variation)
      else if (page.properties.Url && page.properties.Url.url) {
        url = page.properties.Url.url;
      }
      // Also try looking for a property with type 'url'
      else {
        for (const [key, value] of Object.entries(page.properties)) {
          if ((value as any).type === 'url' && (value as any).url) {
            url = (value as any).url;
            break;
          }
        }
      }
      
      // Extract type as a simple string
      let type = 'Publication'; // Default value
      
      if (page.properties.Type && page.properties.Type.select) {
        type = page.properties.Type.select.name || type;
      }
      
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      return {
        id: page.id,
        title,
        url,
        content: content.parent,
        type
      };
    })
  );
}

// Function to fetch reference type options as strings
export async function getReferenceTypeOptions(): Promise<string[]> {
  const databaseId = process.env.NOTION_REFERENCES_DB_ID as string;
  
  try {
    // Fetch database information to get the select options
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });
    
    // Get the Type property's select options
    const typeProperty = Object.values(database.properties).find(
      (prop: any) => prop.name.toLowerCase() === 'type' && prop.type === 'select'
    );
    
    if (!typeProperty || !typeProperty.select || !typeProperty.select.options) {
      console.warn('No reference type options found in Notion database');
      return ['Publication']; // Default option
    }
    
    // Extract just the option names
    return typeProperty.select.options.map((option: any) => option.name);
  } catch (error) {
    console.error('Error fetching reference type options:', error);
    return ['Publication']; // Default option
  }
}

// Function to fetch and parse disciplines
export async function getDisciplines(): Promise<Discipline[]> {
  const databaseId = process.env.NOTION_DISCIPLINES_DB_ID as string;
  
  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      const title = page.properties.Title.title[0]?.plain_text || 'Untitled';
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      return {
        id: page.id,
        title,
        content: content.parent
      };
    })
  );
}

// Function to fetch and parse solutions with their references
export async function getSolutions(references: Reference[]): Promise<Solution[]> {
  const databaseId = process.env.NOTION_SOLUTIONS_DB_ID as string;
  
  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      const title = page.properties.Title.title[0]?.plain_text || 'Untitled';
      
      // Get the reference relations
      const referenceRelations = page.properties.References?.relation || [];
      const solutionReferences = referenceRelations.map((ref: any) => {
        return references.find(r => r.id === ref.id);
      }).filter(Boolean);
      
      // Extract rank using the helper function
      const rank = extractRankFromPage(page, title);
      
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      return {
        id: page.id,
        title,
        content: content.parent,
        rank,
        references: solutionReferences
      };
    })
  );
}

// Function to fetch and parse bottlenecks with their disciplines and solutions
export async function getBottlenecks(
  disciplines: Discipline[],
  solutions: Solution[]
): Promise<Bottleneck[]> {
  const databaseId = process.env.NOTION_BOTTLENECKS_DB_ID as string;
  
  const response = await notion.databases.query({
    database_id: databaseId,
  });

  return Promise.all(
    response.results.map(async (page: any) => {
      const title = page.properties.Title.title[0]?.plain_text || 'Untitled';
      
      // Get the discipline relation
      const disciplineRelation = page.properties.Discipline?.relation[0] || null;
      const bottleneckDiscipline = disciplineRelation 
        ? disciplines.find(d => d.id === disciplineRelation.id)
        : null;
      
      // Get the solution relations
      const solutionRelations = page.properties.Solutions?.relation || [];
      const bottleneckSolutions = solutionRelations.map((sol: any) => {
        return solutions.find(s => s.id === sol.id);
      }).filter(Boolean);
      
      // Extract rank using the helper function
      const rank = extractRankFromPage(page, title);
      
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      // Generate a slug from the title
      const slug = title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
      
      return {
        id: page.id,
        title,
        content: content.parent,
        slug,
        rank,
        discipline: bottleneckDiscipline || { id: '', title: 'Uncategorized', content: '' },
        solutions: bottleneckSolutions
      };
    })
  );
}

// Main function to get all data with relationships
export async function getAllData(): Promise<{
  references: Reference[];
  disciplines: Discipline[];
  solutions: Solution[];
  bottlenecks: Bottleneck[];
  referenceTypeOptions: string[];
}> {
  // We need to fetch these in order to maintain relationships
  const references = await getReferences();
  const disciplines = await getDisciplines();
  const solutions = await getSolutions(references);
  const bottlenecks = await getBottlenecks(disciplines, solutions);
  const referenceTypeOptions = await getReferenceTypeOptions();
  
  return {
    references,
    disciplines,
    solutions,
    bottlenecks,
    referenceTypeOptions
  };
}