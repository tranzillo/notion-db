import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getReferences, 
  getDisciplines, 
  getSolutions, 
  getBottlenecks, 
  getAllData 
} from '../src/lib/notion';

// Mock the @notionhq/client module
vi.mock('@notionhq/client', () => {
  return {
    Client: vi.fn(() => ({
      databases: {
        query: vi.fn(async ({ database_id }) => {
          // Return mock data based on database ID
          if (database_id === 'mock-references-db-id') {
            return {
              results: [
                {
                  id: 'ref1',
                  properties: {
                    Title: { title: [{ plain_text: 'Reference 1' }] },
                    URL: { url: 'https://example.com/ref1' }
                  }
                },
                {
                  id: 'ref2',
                  properties: {
                    Title: { title: [{ plain_text: 'Reference 2' }] },
                    URL: { url: 'https://example.com/ref2' }
                  }
                }
              ]
            };
          } else if (database_id === 'mock-disciplines-db-id') {
            return {
              results: [
                {
                  id: 'disc1',
                  properties: {
                    Title: { title: [{ plain_text: 'Discipline 1' }] }
                  }
                },
                {
                  id: 'disc2',
                  properties: {
                    Title: { title: [{ plain_text: 'Discipline 2' }] }
                  }
                }
              ]
            };
          } else if (database_id === 'mock-solutions-db-id') {
            return {
              results: [
                {
                  id: 'sol1',
                  properties: {
                    Title: { title: [{ plain_text: 'Solution 1' }] },
                    References: { relation: [{ id: 'ref1' }] }
                  }
                },
                {
                  id: 'sol2',
                  properties: {
                    Title: { title: [{ plain_text: 'Solution 2' }] },
                    References: { relation: [{ id: 'ref2' }] }
                  }
                }
              ]
            };
          } else if (database_id === 'mock-bottlenecks-db-id') {
            return {
              results: [
                {
                  id: 'bottle1',
                  properties: {
                    Title: { title: [{ plain_text: 'Bottleneck 1' }] },
                    Discipline: { relation: [{ id: 'disc1' }] },
                    Solutions: { relation: [{ id: 'sol1' }] }
                  }
                },
                {
                  id: 'bottle2',
                  properties: {
                    Title: { title: [{ plain_text: 'Bottleneck 2' }] },
                    Discipline: { relation: [{ id: 'disc2' }] },
                    Solutions: { relation: [{ id: 'sol2' }] }
                  }
                }
              ]
            };
          }
          
          return { results: [] };
        })
      }
    }))
  };
});

// Mock the notion-to-md module
vi.mock('notion-to-md', () => {
  return {
    NotionToMarkdown: vi.fn(() => ({
      pageToMarkdown: vi.fn(async () => []),
      toMarkdownString: vi.fn(() => ({ parent: 'Mocked markdown content' }))
    }))
  };
});

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn()
}));

// Mock environment variables
beforeEach(() => {
  vi.stubEnv('NOTION_API_KEY', 'mock-api-key');
  vi.stubEnv('NOTION_REFERENCES_DB_ID', 'mock-references-db-id');
  vi.stubEnv('NOTION_DISCIPLINES_DB_ID', 'mock-disciplines-db-id');
  vi.stubEnv('NOTION_SOLUTIONS_DB_ID', 'mock-solutions-db-id');
  vi.stubEnv('NOTION_BOTTLENECKS_DB_ID', 'mock-bottlenecks-db-id');
});

describe('Notion API Functions', () => {
  it('should fetch references correctly', async () => {
    const references = await getReferences();
    
    expect(references).toHaveLength(2);
    expect(references[0].id).toBe('ref1');
    expect(references[0].title).toBe('Reference 1');
    expect(references[0].url).toBe('https://example.com/ref1');
    expect(references[0].content).toBe('Mocked markdown content');
  });
  
  it('should fetch disciplines correctly', async () => {
    const disciplines = await getDisciplines();
    
    expect(disciplines).toHaveLength(2);
    expect(disciplines[0].id).toBe('disc1');
    expect(disciplines[0].title).toBe('Discipline 1');
    expect(disciplines[0].content).toBe('Mocked markdown content');
  });
  
  it('should fetch solutions with references correctly', async () => {
    const references = await getReferences();
    const solutions = await getSolutions(references);
    
    expect(solutions).toHaveLength(2);
    expect(solutions[0].id).toBe('sol1');
    expect(solutions[0].title).toBe('Solution 1');
    expect(solutions[0].content).toBe('Mocked markdown content');
    expect(solutions[0].references).toHaveLength(1);
    expect(solutions[0].references[0].id).toBe('ref1');
  });
  
  it('should fetch bottlenecks with disciplines and solutions correctly', async () => {
    const references = await getReferences();
    const disciplines = await getDisciplines();
    const solutions = await getSolutions(references);
    const bottlenecks = await getBottlenecks(disciplines, solutions);
    
    expect(bottlenecks).toHaveLength(2);
    expect(bottlenecks[0].id).toBe('bottle1');
    expect(bottlenecks[0].title).toBe('Bottleneck 1');
    expect(bottlenecks[0].content).toBe('Mocked markdown content');
    expect(bottlenecks[0].discipline.id).toBe('disc1');
    expect(bottlenecks[0].solutions).toHaveLength(1);
    expect(bottlenecks[0].solutions[0].id).toBe('sol1');
  });
  
  it('should generate slugs correctly', async () => {
    const references = await getReferences();
    const disciplines = await getDisciplines();
    const solutions = await getSolutions(references);
    const bottlenecks = await getBottlenecks(disciplines, solutions);
    
    expect(bottlenecks[0].slug).toBe('bottleneck-1');
    expect(bottlenecks[1].slug).toBe('bottleneck-2');
  });
  
  it('should fetch all data with relationships correctly', async () => {
    const data = await getAllData();
    
    expect(data.references).toHaveLength(2);
    expect(data.disciplines).toHaveLength(2);
    expect(data.solutions).toHaveLength(2);
    expect(data.bottlenecks).toHaveLength(2);
    
    // Check relationships
    expect(data.bottlenecks[0].discipline.id).toBe('disc1');
    expect(data.bottlenecks[0].solutions[0].id).toBe('sol1');
    expect(data.bottlenecks[0].solutions[0].references[0].id).toBe('ref1');
  });
});