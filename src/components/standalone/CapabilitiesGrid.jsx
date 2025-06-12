// src/components/standalone/CapabilitiesGrid.jsx
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import FoundationalCapabilityCard from './FoundationalCapabilityCard';
import { scrollToSavedPosition } from '../../lib/scrollPositionUtils';
import { createFieldSlug } from '../../lib/slugUtils';
import { sharedFieldStore, loadSelectedFields } from '../../lib/sharedStore';
import IntegratedNetworkView from './IntegratedNetworkView';

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
  initialSortBy = 'bottlenecks',
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
  const [viewType, setViewType] = useState('grid');
  const [isMounted, setIsMounted] = useState(false);

  // Initialize after mount
  useEffect(() => {
    setIsMounted(true);
    
    try {
      // First try to load field selections from shared store
      const sharedFields = loadSelectedFields();
      if (sharedFields && sharedFields.length > 0) {
        setSelectedFields(sharedFields);
      }
      
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
            // Find fields by matching slug to field_name
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
        
        // Check for sort parameter - default to 'bottlenecks' for capabilities view
        if (urlSortBy && ['bottlenecks', 'alpha'].includes(urlSortBy)) {
          setSortBy(urlSortBy);
        } else if (!urlSortBy) {
          // If no sort is specified, default to bottlenecks
          setSortBy('bottlenecks');
          // Update URL to match
          const newParams = new URLSearchParams(window.location.search);
          newParams.set('sort', 'bottlenecks');
          const newUrl = `${window.location.pathname}?${newParams.toString()}`;
          window.history.replaceState(null, '', newUrl);
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
        // Default to bottlenecks sorting if an invalid sort type is provided
        const countA = a.bottlenecks?.length || 0;
        const countB = b.bottlenecks?.length || 0;
        
        if (countA === countB) {
          return a.fc_name.localeCompare(b.fc_name);
        }
        
        return countB - countA; // Higher count first
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
  useEffect(() => {
    const handleViewChange = (event) => {
      // Update view type based on the new viewType or legacy isListView value
      if (event.detail.viewType) {
        setViewType(event.detail.viewType);
      } else if (event.detail.isListView !== undefined) {
        setViewType(event.detail.isListView ? 'list' : 'grid');
      }
      
      // Check for graph view specifically
      if (event.detail.isGraphView) {
        setViewType('graph');
      }
    };
  
    window.addEventListener('view-changed', handleViewChange);
    
    // Check window.userPreferences for initial value
    if (typeof window !== 'undefined' && window.userPreferences) {
      if (window.userPreferences.viewType) {
        setViewType(window.userPreferences.viewType);
      } else if (window.userPreferences.isListView) {
        setViewType('list');
      } else if (window.userPreferences.isGraphView) {
        setViewType('graph');
      }
    }
  
    return () => {
      window.removeEventListener('view-changed', handleViewChange);
    };
  }, []);
  
  // Attempt to restore scroll position after filtered capabilities are updated
  useEffect(() => {
    // Only try to restore scroll if this is a back navigation to dashboard
    if (filteredCapabilities.length > 0 && !hasRestoredScroll) {
      // Import and use scrollPositionUtils directly
      import('../../lib/scrollPositionUtils').then(({ isBackNavigationToDashboard, scrollToSavedPosition }) => {
        if (isBackNavigationToDashboard()) {
          // Wait a bit for the DOM to update
          setTimeout(() => {
            scrollToSavedPosition(filteredCapabilities);
            setHasRestoredScroll(true);
          }, 100);
        }
      });
    }
  }, [filteredCapabilities, hasRestoredScroll]);

  return (
    <div className={gridClass}>
      {viewType === 'graph' ? (
        <IntegratedNetworkView
          bottlenecks={bottlenecks}
          capabilities={filteredCapabilities}
          resources={resources} // You'll need to fetch resources
          fields={fields}
          searchQuery={searchQuery}
          selectedFieldIds={selectedFields}
          selectedTag={selectedTag}
          privateTag={privateTag}
          viewType="capabilities"
        />
      ) : (
        filteredCapabilities.map((capability) => (
          <FoundationalCapabilityCard
            key={capability.id}
            capability={capability}
            searchQuery={searchQuery}
            selectedFields={selectedFields}
          />
        ))
      )}
      
      {viewType !== 'graph' && filteredCapabilities.length === 0 && (
        <div className="bottleneck-grid__empty-state">
          <h3>No results found</h3>
          <p>
            We could not find any capabilities matching your search criteria.
            Try adjusting your filters or search terms.
          </p>
        </div>
      )}
    </div>
  );
}