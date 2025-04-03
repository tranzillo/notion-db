// src/components/standalone/DashboardGrid.jsx
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import BottleneckCard from './BottleneckCard';
import { scrollToSavedPosition } from '../../lib/scrollPositionUtils';
import { createFieldSlug } from '../../lib/slugUtils';

// Configure Fuse.js options for fuzzy search
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    {
      name: 'bottleneck_name', // Updated field name
      weight: 0.7
    },
    {
      name: 'bottleneck_description', // Updated field name
      weight: 0.5
    },
    {
      name: 'field.field_name', // Updated field name
      weight: 0.3
    },
    {
      name: 'tags',
      weight: 0.4
    },
    {
      name: 'bottleneck_rank', // Updated field name
      weight: 0.2
    },
    {
      name: 'bottleneck_number', // Updated field name
      weight: 0.2
    }
  ]
};

export default function BottleneckGrid({
  bottlenecks = [],
  initialSearchQuery = '',
  initialSelectedFieldIds = [], // renamed from initialSelectedDisciplineIds
  initialSortBy = 'rank',
  initialSelectedTag = '',
  initialPrivateTag = ''
}) {
  // Always start with consistent state for SSR
  const [filteredBottlenecks, setFilteredBottlenecks] = useState(bottlenecks);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(initialSearchQuery);
  const [selectedFields, setSelectedFields] = useState(initialSelectedFieldIds);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [isListView, setIsListView] = useState(false);
  const [selectedTag, setSelectedTag] = useState(initialSelectedTag);
  const [privateTag, setPrivateTag] = useState(initialPrivateTag);
  const [fuse, setFuse] = useState(null);
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);
  // Add this to prevent filtering until component is mounted
  const [isMounted, setIsMounted] = useState(false);

  // Initialize after mount
  useEffect(() => {
    setIsMounted(true);
    
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
          
          // Convert slugs to IDs using the slugUtils function
          const disciplineIds = disciplineSlugs.map(slug => {
            const match = bottlenecks.find(b =>
              b.field && createFieldSlug(b.field.field_name) === slug
            )?.field;
            return match ? match.id : null;
          }).filter(Boolean);
          
          if (disciplineIds.length > 0 && 
              JSON.stringify(disciplineIds) !== JSON.stringify(selectedFields)) {
            setSelectedFields(disciplineIds);
          }
        }
        
        // Check for sort parameter
        if (urlSortBy && ['rank', 'index', 'alpha'].includes(urlSortBy)) {
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
    if (bottlenecks.length > 0) {
      setFuse(new Fuse(bottlenecks, fuseOptions));
    }
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

      // Convert slugs to IDs using the slugUtils function
      const disciplineIds = disciplineSlugs.map(slug => {
        const match = bottlenecks.find(b =>
          b.field && createFieldSlug(b.field.field_name) === slug
        )?.field;
        return match ? match.id : null;
      }).filter(Boolean);

      if (disciplineIds.length > 0) {
        setSelectedFields(disciplineIds);
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

  // Initialize search index
  useEffect(() => {
    if (bottlenecks.length > 0) {
      setFuse(new Fuse(bottlenecks, fuseOptions));
    }
  }, [bottlenecks]);

  // Listen for URL parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    const urlFields = params.get('fields');
    const urlSortBy = params.get('sort');
    const urlTag = params.get('tag');
    const urlPrivateTag = params.get('for');

    if (urlQuery) {
      setCurrentSearchQuery(urlQuery);
    }

    if (urlFields) {
      const fieldSlugs = urlFields.split(',');

      // Convert slugs to IDs
      const fieldIds = fieldSlugs.map(slug => {
        const match = bottlenecks.find(b =>
          b.field && b.field.title.toLowerCase().replace(/\s+/g, '-') === slug
        )?.field;
        return match ? match.id : null;
      }).filter(Boolean);

      if (fieldIds.length > 0) {
        setSelectedFields(fieldIds);
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

  // Listen for field filter changes from other components
  useEffect(() => {
    const handleFieldChange = (event) => {
      setSelectedFields(event.detail.selectedFields);
    };

    window.addEventListener('fields-changed', handleFieldChange);

    return () => {
      window.removeEventListener('fields-changed', handleFieldChange);
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

  // Apply filtering and sorting when search, fields, tags, or sort method change
  useEffect(() => {
    if (!isMounted || !fuse) return;

    // Apply search
    let filteredResults = currentSearchQuery
      ? fuse.search(currentSearchQuery).map(result => result.item)
      : bottlenecks;

    // Apply field filtering
    if (selectedFields.length > 0) {
      filteredResults = filteredResults.filter(bottleneck =>
        bottleneck.field &&
        selectedFields.includes(bottleneck.field.id)
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
        return a.bottleneck_name.localeCompare(b.bottleneck_name);
      } else if (sortBy === 'bottleneck_number') {
        // Sort primarily by bottleneck_number (ascending)
        const numberA = parseInt(a.bottleneck_number) || 0;
        const numberB = parseInt(b.bottleneck_number) || 0;
        
        if (numberA === numberB) {
          // If indices are equal, fall back to title as tiebreaker
          return a.bottleneck_name.localeCompare(b.bottleneck_name);
        }
        
        return numberA - numberB; // Lower number first
      } else {
        // Default: sort by rank (descending) with bottleneck_number as tiebreaker
        const rankA = parseInt(a.bottleneck_rank) || 0;
        const rankB = parseInt(b.bottleneck_rank) || 0;
        
        if (rankA === rankB) {
          // If ranks are equal, sort by bottleneck_number (ascending)
          const numberA = parseInt(a.bottleneck_number) || 0;
          const numberB = parseInt(b.bottleneck_number) || 0;
          
          if (numberA === numberB) {
            // If both ranks and numbers are equal, fall back to alphabetical
            return a.bottleneck_name.localeCompare(b.bottleneck_name);
          }
          
          return numberA - numberB; // Lower number first
        }
        
        return rankB - rankA; // Higher rank first
      }
    });

    setFilteredBottlenecks(filteredResults);
  }, [
    currentSearchQuery, 
    selectedFields, 
    selectedTag, 
    privateTag, 
    sortBy, 
    fuse, 
    bottlenecks,
    isMounted // Add this dependency
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
          selectedFields={selectedFields}
        />
      ))}
    </div>
  );
}