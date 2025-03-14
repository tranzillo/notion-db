import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createSearchIndex, 
  searchBottlenecks, 
  filterBottlenecksByDisciplines,
  parseQueryParams,
  updateQueryParams
} from '../src/lib/search';
import type { Bottleneck } from '../src/lib/notion';

// Mock data for testing
const mockBottlenecks: Bottleneck[] = [
  {
    id: 'bottle1',
    title: 'Quantum Computing Limitations',
    content: 'Current quantum computers face decoherence issues.',
    slug: 'quantum-computing-limitations',
    discipline: {
      id: 'disc1',
      title: 'Physics',
      content: 'Physics discipline content'
    },
    solutions: []
  },
  {
    id: 'bottle2',
    title: 'Drug Discovery Challenges',
    content: 'Testing new pharmaceuticals takes too long.',
    slug: 'drug-discovery-challenges',
    discipline: {
      id: 'disc2',
      title: 'Biology',
      content: 'Biology discipline content'
    },
    solutions: []
  },
  {
    id: 'bottle3',
    title: 'AI Alignment Problem',
    content: 'Aligning AI goals with human values is difficult.',
    slug: 'ai-alignment-problem',
    discipline: {
      id: 'disc3',
      title: 'Computer Science',
      content: 'CS discipline content'
    },
    solutions: []
  }
];

// Mock window.location for URL parameter tests
beforeEach(() => {
  // Mock window.location
  // @ts-ignore - We're intentionally mocking this
  delete window.location;
  // @ts-ignore
  window.location = {
    pathname: '/',
    search: '',
    href: 'http://localhost:3000/',
    // Add other properties as needed
    toString: () => window.location.href
  };
  
  // Mock history API
  // @ts-ignore
  window.history = {
    pushState: vi.fn()
  };
});

describe('Search Functionality', () => {
  it('should create a search index correctly', () => {
    const fuse = createSearchIndex(mockBottlenecks);
    expect(fuse).toBeDefined();
    expect(fuse.getIndex().size()).toBe(3);
  });
  
  it('should search bottlenecks correctly', () => {
    const fuse = createSearchIndex(mockBottlenecks);
    
    // Search for quantum
    const quantumResults = searchBottlenecks(fuse, 'quantum');
    expect(quantumResults).toHaveLength(1);
    expect(quantumResults[0].id).toBe('bottle1');
    
    // Search for drug
    const drugResults = searchBottlenecks(fuse, 'drug');
    expect(drugResults).toHaveLength(1);
    expect(drugResults[0].id).toBe('bottle2');
    
    // Search for something that should match multiple
    const aiResults = searchBottlenecks(fuse, 'ai');
    expect(aiResults).toHaveLength(1);
    expect(aiResults[0].id).toBe('bottle3');
    
    // Search with no query should return all
    const allResults = searchBottlenecks(fuse, '');
    expect(allResults).toHaveLength(3);
  });
  
  it('should filter bottlenecks by disciplines correctly', () => {
    // Filter by Physics
    const physicsResults = filterBottlenecksByDisciplines(mockBottlenecks, ['disc1']);
    expect(physicsResults).toHaveLength(1);
    expect(physicsResults[0].id).toBe('bottle1');
    
    // Filter by Biology
    const biologyResults = filterBottlenecksByDisciplines(mockBottlenecks, ['disc2']);
    expect(biologyResults).toHaveLength(1);
    expect(biologyResults[0].id).toBe('bottle2');
    
    // Filter by multiple disciplines
    const multipleResults = filterBottlenecksByDisciplines(mockBottlenecks, ['disc1', 'disc3']);
    expect(multipleResults).toHaveLength(2);
    expect(multipleResults.map(b => b.id)).toContain('bottle1');
    expect(multipleResults.map(b => b.id)).toContain('bottle3');
    
    // No disciplines selected should return all
    const allResults = filterBottlenecksByDisciplines(mockBottlenecks, []);
    expect(allResults).toHaveLength(3);
  });
  
  it('should parse query parameters correctly', () => {
    // @ts-ignore
    window.location.search = '?q=quantum&disciplines=disc1,disc3';
    
    const params = parseQueryParams();
    expect(params.searchQuery).toBe('quantum');
    expect(params.selectedDisciplines).toEqual(['disc1', 'disc3']);
    
    // Test with empty params
    // @ts-ignore
    window.location.search = '';
    
    const emptyParams = parseQueryParams();
    expect(emptyParams.searchQuery).toBe('');
    expect(emptyParams.selectedDisciplines).toEqual([]);
  });
  
  it('should update query parameters correctly', () => {
    updateQueryParams('quantum', ['disc1', 'disc3']);
    
    // @ts-ignore
    expect(window.history.pushState).toHaveBeenCalled();
    // The URL should be updated with the parameters
    // @ts-ignore
    const pushStateArgs = window.history.pushState.mock.calls[0];
    expect(pushStateArgs[2]).toBe('/?q=quantum&disciplines=disc1,disc3');
    
    // Test with empty params
    updateQueryParams('', []);
    
    // @ts-ignore
    expect(window.history.pushState).toHaveBeenCalledTimes(2);
    // The URL should be updated with no parameters
    // @ts-ignore
    const emptyPushStateArgs = window.history.pushState.mock.calls[1];
    expect(emptyPushStateArgs[2]).toBe('/');
  });
});