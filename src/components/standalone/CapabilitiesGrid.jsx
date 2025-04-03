// src/components/standalone/CapabilitiesGrid.jsx
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import FoundationalCapabilityCard from './FoundationalCapabilityCard';
import { scrollToSavedPosition } from '../../lib/scrollPositionUtils';
import { createFieldSlug } from '../../lib/slugUtils';

// Configure Fuse.js options for fuzzy search
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    {
      name: 'fc_name',
      weight: 0.7
    },
    {
      name: 'fc_description',
      weight: 0.5
    },
    {
      name: 'bottlenecks.field.field_name',
      weight: 0.3
    },
    {
      name: 'tags',
      weight: 0.4
    }
  ]
};

export default function CapabilitiesGrid({
  capabilities = [],
  initialSearchQuery = '',
  initialSelectedFieldIds = [],
  initialSortBy = 'alpha',
  initialSelectedTag = '',
  initialPrivateTag = ''
}) {
  // State for filtered capabilities and search/filter parameters
  const [filteredCapabilities, setFilteredCapabilities] = useState(capabilities);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(initialSearchQuery);
  const [selectedFields, setSelectedFields] = useState(initialSelectedFieldIds);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [isListView, setIsListView] = useState(false);
  const [selectedTag, setSelectedTag] = useState(initialSelectedTag);
  const [privateTag, setPrivateTag] = useState(initialPrivateTag);
  const [fuse, setFuse] = useState(null);
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize after mount
  useEffect(() => {
    setIsMounted(true);
    
    try {
      // Check for global preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        setIsListView(window.userPreferences.isListView);
      }
      
      // Check URL parameters to ensure we're showing the correct filters
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlQuery = params.get('q');
        const urlFields = params.get('fields');
        const urlSortBy = params.get('sort');
        const urlTag = params.get('tag');
        const urlPrivateTag = params.get('for');
        
        if (urlQuery && urlQuery !== currentSearchQuery) {
          setCurrentSearchQuery(urlQuery);
        }
        
        if (urlFields) {
          const fieldSlugs = urlFields.split(',');
          
          // Convert slugs to IDs
          const fieldIds = fieldSlugs.map(slug => {
            // Find field by matching slug to field title
            const matchingFields = capabilities.flatMap(capability => 
              capability.bottlenecks?.map(bottleneck => bottleneck.field) || []
            ).filter(Boolean);
            
            const match = matchingFields.find(f => 
              f && f.field_name && createFieldSlug(f.field_name) === slug
            );
            
            return match ? match.id : null;
          }).filter(Boolean);
          
          if (fieldIds.length > 0 && 
              JSON.stringify(fieldIds) !== JSON.stringify(selectedFields)) {
            setSelectedFields(fieldIds);
          }
        }
        
        // Check for sort parameter
        if (urlSortBy && ['bottlenecks', 'alpha'].includes(urlSortBy)) {
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
    if (capabilities && capabilities.length > 0) {
      setFuse(new Fuse(capabilities, fuseOptions));
    }
  }, [capabilities]);

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
      : capabilities;

    // Apply field filtering
    if (selectedFields.length > 0) {
      filteredResults = filteredResults.filter(capability => {
        // Check if any of the associated bottlenecks have a selected field
        return capability.bottlenecks && capability.bottlenecks.some(bottleneck => 
          bottleneck.field && selectedFields.includes(bottleneck.field.id)
        );
      });
    }
    
    // Apply public tag filtering
    if (selectedTag) {
      filteredResults = filteredResults.filter(capability =>
        capability.tags && capability.tags.includes(selectedTag)
      );
    }
    
    // Apply private tag filtering
    if (privateTag) {
      filteredResults = filteredResults.filter(capability =>
        capability.privateTags && capability.privateTags.includes(privateTag)
      );
    }

    // Apply sorting
    filteredResults = [...filteredResults].sort((a, b) => {
      if (sortBy === 'alpha') {
        // Sort alphabetically by fc_name
        return a.fc_name.localeCompare(b.fc_name);
      } else if (sortBy === 'bottlenecks') {
        // Sort by number of bottlenecks (descending) with alphabetical fc_name as tiebreaker
        const countA = a.bottlenecks?.length || 0;
        const countB = b.bottlenecks?.length || 0;
        
        if (countA === countB) {
          return a.fc_name.localeCompare(b.fc_name);
        }
        
        return countB - countA; // Higher count first
      } else {
        // Default to alphabetical
        return a.fc_name.localeCompare(b.fc_name);
      }
    });

    setFilteredCapabilities(filteredResults);
  }, [
    currentSearchQuery, 
    selectedFields, 
    selectedTag, 
    privateTag, 
    sortBy, 
    fuse, 
    capabilities,
    isMounted
  ]);
  
  // Attempt to restore scroll position after filtered capabilities are updated
  useEffect(() => {
    // Only try to restore scroll once
    if (!hasRestoredScroll && filteredCapabilities.length > 0) {
      // Wait a bit for the DOM to update
      setTimeout(() => {
        scrollToSavedPosition(filteredCapabilities);
        setHasRestoredScroll(true);
      }, 100);
    }
  }, [filteredCapabilities, hasRestoredScroll]);

  const gridClass = isListView ? 'bottleneck-grid bottleneck-grid--list-view' : 'bottleneck-grid';

  if (filteredCapabilities.length === 0) {
    return (
      <div className={gridClass}>
        <div className="bottleneck-grid__empty-state">
          <h3>No results found</h3>
          <p>
            We could not find any foundational capabilities matching your search criteria.
            Try adjusting your filters or search terms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {filteredCapabilities.map((capability) => (
        <FoundationalCapabilityCard
          key={capability.id}
          capability={capability}
          searchQuery={currentSearchQuery}
          selectedFields={selectedFields}
        />
      ))}
    </div>
  );
}