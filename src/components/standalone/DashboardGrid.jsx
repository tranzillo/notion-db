// src/components/standalone/DashboardGrid.jsx
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import BottleneckCard from './BottleneckCard';
import { scrollToSavedPosition } from '../../lib/scrollPositionUtils';

// Configure Fuse.js options for fuzzy search
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    {
      name: 'title',
      weight: 0.7
    },
    {
      name: 'content',
      weight: 0.5
    },
    {
      name: 'discipline.title',
      weight: 0.3
    },
    {
      name: 'tags',
      weight: 0.4
    },
    {
      name: 'rank',
      weight: 0.2
    }
  ]
};

export default function BottleneckGrid({
  bottlenecks = [],
  initialSearchQuery = '',
  initialSelectedDisciplineIds = [],
  initialSortBy = 'rank',
  initialSelectedTag = '',
  initialPrivateTag = ''
}) {
  // Always start with consistent state for SSR
  const [filteredBottlenecks, setFilteredBottlenecks] = useState(bottlenecks);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(initialSearchQuery);
  const [selectedDisciplines, setSelectedDisciplines] = useState(initialSelectedDisciplineIds);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [isListView, setIsListView] = useState(false);
  const [selectedTag, setSelectedTag] = useState(initialSelectedTag);
  const [privateTag, setPrivateTag] = useState(initialPrivateTag);
  const [fuse, setFuse] = useState(null);
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);

  // Initialize after mount
  useEffect(() => {
    try {
      // Check for global preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        setIsListView(window.userPreferences.isListView);
      }
      
      // Check if we're coming back from a detail page
      // Parse URL parameters to ensure we're showing the correct filters
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlQuery = params.get('q');
        const urlDisciplines = params.get('disciplines');
        const urlSortBy = params.get('sort');
        const urlTag = params.get('tag');
        const urlPrivateTag = params.get('for');
        
        if (urlQuery && urlQuery !== currentSearchQuery) {
          setCurrentSearchQuery(urlQuery);
        }
        
        if (urlDisciplines) {
          const disciplineSlugs = urlDisciplines.split(',');
          
          // Convert slugs to IDs
          const disciplineIds = disciplineSlugs.map(slug => {
            const match = bottlenecks.find(b =>
              b.discipline && b.discipline.title.toLowerCase().replace(/\s+/g, '-') === slug
            )?.discipline;
            return match ? match.id : null;
          }).filter(Boolean);
          
          if (disciplineIds.length > 0 && 
              JSON.stringify(disciplineIds) !== JSON.stringify(selectedDisciplines)) {
            setSelectedDisciplines(disciplineIds);
          }
        }
        
        // Check for sort parameter
        if (urlSortBy && ['rank', 'alpha'].includes(urlSortBy)) {
          setSortBy(urlSortBy);
        }
        
        // Check for tag parameter
        if (urlTag && urlTag !== selectedTag) {
          setSelectedTag(urlTag);
        }
        
        // Check for private tag parameter
        if (urlPrivateTag && urlPrivateTag !== privateTag) {
          setPrivateTag(urlPrivateTag);
        }
      }
    } catch (e) {
      console.error('Error loading view preference:', e);
    }
  }, []);

  // Initialize search index
  useEffect(() => {
    setFuse(new Fuse(bottlenecks, fuseOptions));
  }, [bottlenecks]);

  // Listen for URL parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    const urlDisciplines = params.get('disciplines');
    const urlSortBy = params.get('sort');
    const urlTag = params.get('tag');
    const urlPrivateTag = params.get('for');

    if (urlQuery) {
      setCurrentSearchQuery(urlQuery);
    }

    if (urlDisciplines) {
      const disciplineSlugs = urlDisciplines.split(',');

      // Convert slugs to IDs
      const disciplineIds = disciplineSlugs.map(slug => {
        const match = bottlenecks.find(b =>
          b.discipline && b.discipline.title.toLowerCase().replace(/\s+/g, '-') === slug
        )?.discipline;
        return match ? match.id : null;
      }).filter(Boolean);

      if (disciplineIds.length > 0) {
        setSelectedDisciplines(disciplineIds);
      }
    }
    
    // Check for sort parameter
    if (urlSortBy && ['rank', 'alpha'].includes(urlSortBy)) {
      setSortBy(urlSortBy);
    }
    
    // Check for tag parameter
    if (urlTag) {
      setSelectedTag(urlTag);
    }
    
    // Check for private tag parameter
    if (urlPrivateTag) {
      setPrivateTag(urlPrivateTag);
    }
  }, [bottlenecks]);

  // Listen for search changes from other components
  useEffect(() => {
    const handleSearchChange = (event) => {
      setCurrentSearchQuery(event.detail.query);
    };

    window.addEventListener('search-changed', handleSearchChange);

    return () => {
      window.removeEventListener('search-changed', handleSearchChange);
    };
  }, []);

  // Listen for discipline filter changes from other components
  useEffect(() => {
    const handleDisciplineChange = (event) => {
      setSelectedDisciplines(event.detail.selectedDisciplines);
    };

    window.addEventListener('disciplines-changed', handleDisciplineChange);

    return () => {
      window.removeEventListener('disciplines-changed', handleDisciplineChange);
    };
  }, []);

  // Listen for tag filter changes
  useEffect(() => {
    const handleTagChange = (event) => {
      setSelectedTag(event.detail.selectedTag);
      
      // Clear private tag if public tag is selected (mutually exclusive)
      if (event.detail.selectedTag) {
        setPrivateTag('');
        
        // Also update URL to remove 'for' parameter
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.delete('for');
          
          const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
          window.history.pushState({}, '', newUrl);
        }
      }
    };

    window.addEventListener('tag-changed', handleTagChange);

    return () => {
      window.removeEventListener('tag-changed', handleTagChange);
    };
  }, []);

  // Listen for private tag filter changes
  useEffect(() => {
    const handlePrivateTagChange = (event) => {
      setPrivateTag(event.detail.privateTag);
      
      // Clear public tag if private tag is selected (mutually exclusive)
      if (event.detail.privateTag) {
        setSelectedTag('');
        
        // Also update URL to remove 'tag' parameter
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.delete('tag');
          
          const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
          window.history.pushState({}, '', newUrl);
        }
      }
    };

    window.addEventListener('private-tag-changed', handlePrivateTagChange);

    return () => {
      window.removeEventListener('private-tag-changed', handlePrivateTagChange);
    };
  }, []);

  // Listen for view toggle button clicks
  useEffect(() => {
    const handleViewChange = (event) => {
      setIsListView(event.detail.isListView);
    };

    window.addEventListener('view-changed', handleViewChange);

    return () => {
      window.removeEventListener('view-changed', handleViewChange);
    };
  }, []);
  
  // Listen for sort changes
  useEffect(() => {
    const handleSortChange = (event) => {
      setSortBy(event.detail.sortBy);
    };

    window.addEventListener('sort-changed', handleSortChange);

    return () => {
      window.removeEventListener('sort-changed', handleSortChange);
    };
  }, []);

  // Apply filtering and sorting when search, disciplines, tags, or sort method change
  useEffect(() => {
    if (!fuse) return;

    // Apply search
    let filteredResults = currentSearchQuery
      ? fuse.search(currentSearchQuery).map(result => result.item)
      : bottlenecks;

    // Apply discipline filtering
    if (selectedDisciplines.length > 0) {
      filteredResults = filteredResults.filter(bottleneck =>
        bottleneck.discipline &&
        selectedDisciplines.includes(bottleneck.discipline.id)
      );
    }
    
    // Apply public tag filtering
    if (selectedTag) {
      filteredResults = filteredResults.filter(bottleneck =>
        bottleneck.tags && bottleneck.tags.includes(selectedTag)
      );
    }
    
    // Apply private tag filtering
    if (privateTag) {
      filteredResults = filteredResults.filter(bottleneck =>
        bottleneck.privateTags && bottleneck.privateTags.includes(privateTag)
      );
    }

    // Apply sorting
    filteredResults = [...filteredResults].sort((a, b) => {
      if (sortBy === 'alpha') {
        // Sort alphabetically by title
        return a.title.localeCompare(b.title);
      } else {
        // Sort by rank (descending) with alphabetical title as tiebreaker
        const rankA = parseInt(a.rank) || 0;
        const rankB = parseInt(b.rank) || 0;
        
        if (rankA === rankB) {
          return a.title.localeCompare(b.title);
        }
        
        return rankB - rankA; // Higher rank first
      }
    });

    setFilteredBottlenecks(filteredResults);
  }, [
    currentSearchQuery, 
    selectedDisciplines, 
    selectedTag, 
    privateTag, 
    sortBy, 
    fuse, 
    bottlenecks
  ]);
  
  // Attempt to restore scroll position after filtered bottlenecks are updated
  useEffect(() => {
    // Only try to restore scroll once
    if (!hasRestoredScroll && filteredBottlenecks.length > 0) {
      // Wait a bit for the DOM to update
      setTimeout(() => {
        scrollToSavedPosition(filteredBottlenecks);
        setHasRestoredScroll(true);
      }, 100);
    }
  }, [filteredBottlenecks, hasRestoredScroll]);

  const gridClass = isListView ? 'bottleneck-grid bottleneck-grid--list-view' : 'bottleneck-grid';

  if (filteredBottlenecks.length === 0) {
    return (
      <div className={gridClass}>
        <div className="bottleneck-grid__empty-state">
          <h3>No results found</h3>
          <p>
            We could not find any bottlenecks matching your search criteria.
            Try adjusting your filters or search terms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {filteredBottlenecks.map((bottleneck) => (
        <BottleneckCard
          key={bottleneck.id}
          bottleneck={bottleneck}
          searchQuery={currentSearchQuery}
          selectedDisciplines={selectedDisciplines}
        />
      ))}
    </div>
  );
}