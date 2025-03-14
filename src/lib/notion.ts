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
  references: Reference[];
}

export interface Bottleneck {
  id: string;
  title: string;
  content: string;
  slug: string;
  discipline: Discipline;
  solutions: Solution[];
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
      
      // Extract URL - handle various formats
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
      
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      return {
        id: page.id,
        title,
        url,
        content: content.parent
      };
    })
  );
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
      
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      return {
        id: page.id,
        title,
        content: content.parent,
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
      
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const content = n2m.toMarkdownString(mdBlocks);
      
      // Generate a slug from the title
      const slug = title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
      
      return {
        id: page.id,
        title,
        content: content.parent,
        slug,
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
}> {
  // We need to fetch these in order to maintain relationships
  const references = await getReferences();
  const disciplines = await getDisciplines();
  const solutions = await getSolutions(references);
  const bottlenecks = await getBottlenecks(disciplines, solutions);
  
  return {
    references,
    disciplines,
    solutions,
    bottlenecks
  };
}