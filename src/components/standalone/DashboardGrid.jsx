// src/components/standalone/DashboardGrid.jsx
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import BottleneckCard from './BottleneckCard';
import FoundationalCapabilityCard from './FoundationalCapabilityCard';
import ResourceCard from './ResourceCard'; // Import the new ResourceCard component
import { scrollToSavedPosition } from '../../lib/scrollPositionUtils';
import { createFieldSlug } from '../../lib/slugUtils';
import { sharedFieldStore, loadSelectedFields, updateSelectedFields } from '../../lib/sharedStore';
import { updateUrlParamsWithoutHistory } from '../../lib/dataUtils';

// Import IntegratedNetworkView for the direct component reference
import IntegratedNetworkView from './IntegratedNetworkView';

// Configure Fuse.js options for bottlenecks search
const bottleneckSearchOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    {
      name: 'bottleneck_name',
      weight: 0.7
    },
    {
      name: 'bottleneck_description',
      weight: 0.5
    },
    {
      name: 'field.field_name',
      weight: 0.3
    },
    {
      name: 'tags',
      weight: 0.4
    },
    {
      name: 'bottleneck_rank',
      weight: 0.2
    },
    {
      name: 'bottleneck_number',
      weight: 0.2
    }
  ]
};

// Configure Fuse.js options for capabilities search
const capabilitySearchOptions = {
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

// Configure Fuse.js options for resources search
const resourceSearchOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: [
    {
      name: 'resource_title',
      weight: 0.7
    },
    {
      name: 'content',
      weight: 0.5
    },
    {
      name: 'resourceTypes',
      weight: 0.4
    },
    {
      name: 'resource_url',
      weight: 0.2
    }
  ]
};

export default function DashboardGrid({
  viewType = 'bottlenecks', // 'bottlenecks', 'capabilities', or 'resources'
  bottlenecks = [],
  capabilities = [],
  resources = [],
  fields = [],
  initialSearchQuery = '',
  initialSelectedFieldIds = [],
  initialSortBy = null, // Will be determined based on viewType if null
  initialSelectedTag = '',
  initialPrivateTag = ''
}) {
  // Determine default sort based on viewType if not provided
  const getDefaultSortBy = () => {
    if (initialSortBy) return initialSortBy;
    
    switch (viewType) {
      case 'capabilities':
        return 'bottlenecks';
      case 'resources':
        return 'type';
      default: // bottlenecks
        return 'rank';
    }
  };

  const [filteredItems, setFilteredItems] = useState(
    viewType === 'bottlenecks' ? bottlenecks : 
    viewType === 'capabilities' ? capabilities : 
    resources
  );
  const [currentSearchQuery, setCurrentSearchQuery] = useState(initialSearchQuery);
  const [selectedFields, setSelectedFields] = useState(initialSelectedFieldIds);
  const [sortBy, setSortBy] = useState(getDefaultSortBy());
  const [isListView, setIsListView] = useState(false);
  const [selectedTag, setSelectedTag] = useState(initialSelectedTag);
  const [privateTag, setPrivateTag] = useState(initialPrivateTag);
  const [fuse, setFuse] = useState(null);
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', or 'graph'
  const [isMounted, setIsMounted] = useState(false);

  // NetworkView will be rendered through the Astro component
  // This keeps track of whether we need to trigger the Astro component
  const [networkProps, setNetworkProps] = useState(null);

  const [gridViewReady, setGridViewReady] = useState(false);
  const [listViewReady, setListViewReady] = useState(false);
  const [graphViewReady, setGraphViewReady] = useState(false);
  
  // Helper function to get fields and capabilities linked to a resource
  const getResourceRelationships = (resourceId) => {
    // Find capabilities linked to this resource
    const linkedCapabilities = capabilities.filter(capability => 
      capability.resources?.some(r => r.id === resourceId)
    );
    
    // Collect unique fields from bottlenecks connected to those capabilities
    const linkedFieldsMap = new Map();
    linkedCapabilities.forEach(capability => {
      if (capability.bottlenecks) {
        capability.bottlenecks.forEach(bottleneck => {
          if (bottleneck.field?.id) {
            linkedFieldsMap.set(bottleneck.field.id, bottleneck.field);
          }
        });
      }
    });
    
    return {
      linkedCapabilities,
      linkedFields: Array.from(linkedFieldsMap.values())
    };
  };

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
        if (window.userPreferences.viewType) {
          setViewMode(window.userPreferences.viewType);
        } else if (window.userPreferences.isListView) {
          setViewMode('list');
        } else if (window.userPreferences.isGraphView) {
          setViewMode('graph');
        }
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

          // Convert slugs to IDs - handle all view types
          const fieldIds = fieldSlugs.map(slug => {
            let match = null;
            
            // Try to find field from fields array directly
            match = fields.find(f => f && createFieldSlug(f.field_name) === slug);
            
            // If not found and we're in resources view, check through relationships
            if (!match && viewType === 'resources') {
              // For resources, we need to check through related capabilities and bottlenecks
              const allFields = new Set();
              resources.forEach(resource => {
                const { linkedFields } = getResourceRelationships(resource.id);
                linkedFields.forEach(field => {
                  if (createFieldSlug(field.field_name) === slug) {
                    match = field;
                  }
                });
              });
            }
            
            return match ? match.id : null;
          }).filter(Boolean);

          if (fieldIds.length > 0 &&
            JSON.stringify(fieldIds) !== JSON.stringify(selectedFields)) {
            setSelectedFields(fieldIds);
            // Also update the shared store
            updateSelectedFields(fieldIds);
          }
        }

        // Check for sort parameter
        let validSortOptions;
        switch (viewType) {
          case 'capabilities':
            validSortOptions = ['bottlenecks', 'alpha'];
            break;
          case 'resources':
            validSortOptions = ['type', 'alpha'];
            break;
          default: // bottlenecks
            validSortOptions = ['rank', 'alpha'];
        }

        if (urlSortBy && validSortOptions.includes(urlSortBy)) {
          setSortBy(urlSortBy);
        } else if (!urlSortBy || !validSortOptions.includes(urlSortBy)) {
          // Set default sort based on view type
          const defaultSort = getDefaultSortBy();
          setSortBy(defaultSort);
          
          // Update URL to match
          updateUrlParamsWithoutHistory({ sort: defaultSort });
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

  useEffect(() => {
    if (!isMounted) return;
    
    try {
      // Check for user preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        const userViewType = window.userPreferences.viewType;
        if (userViewType) {
          console.log("Loading view type from preferences:", userViewType);
          setViewMode(userViewType);
        }
      }
    } catch (e) {
      console.error('Error loading view preference:', e);
    }
  }, [isMounted]);

  useEffect(() => {
    console.log("Current view mode:", viewMode);
    console.log("View ready states:", { 
      grid: gridViewReady, 
      list: listViewReady, 
      graph: graphViewReady 
    });
  }, [viewMode, gridViewReady, listViewReady, graphViewReady]);

  // Check view readiness
  useEffect(() => {
    if (!isMounted) return;
    console.log("Setting view readiness for mode:", viewMode);
    
    // For grid and list views, they're ready almost immediately
    if (viewMode === 'grid') {
      const timer = setTimeout(() => {
        console.log("Grid view ready");
        setGridViewReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } 
    else if (viewMode === 'list') {
      const timer = setTimeout(() => {
        console.log("List view ready");
        setListViewReady(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewMode, isMounted]);

  // Improved graph view ready listener with fallback
  useEffect(() => {
    console.log("Setting up graph-view-ready listener");
    
    const handleGraphReady = (event) => {
      console.log("Graph ready event received!", event);
      setGraphViewReady(true);
    };
    
    // Add event listener
    window.addEventListener('graph-view-ready', handleGraphReady);
    
    // Fallback mechanism - if we're in graph view and it hasn't become ready
    let fallbackTimer;
    if (viewMode === 'graph' && !graphViewReady) {
      console.log("Setting fallback timer for graph readiness");
      fallbackTimer = setTimeout(() => {
        console.log("FALLBACK: Setting graph view ready after timeout");
        setGraphViewReady(true);
      }, 5000); // 5 second fallback
    }
    
    return () => {
      console.log("Cleaning up graph ready listener");
      window.removeEventListener('graph-view-ready', handleGraphReady);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [viewMode, graphViewReady]);
  
  // Reset ready states when changing views
  useEffect(() => {
    if (viewMode === 'grid') {
      setListViewReady(false);
      setGraphViewReady(false);
    } 
    else if (viewMode === 'list') {
      setGridViewReady(false);
      setGraphViewReady(false);
    }
    else if (viewMode === 'graph') {
      setGridViewReady(false);
      setListViewReady(false);
    }
  }, [viewMode]);

  // Initialize search index
  useEffect(() => {
    if (!isMounted) return;

    let items;
    let options;

    switch (viewType) {
      case 'capabilities':
        items = capabilities;
        options = capabilitySearchOptions;
        break;
      case 'resources':
        items = resources;
        options = resourceSearchOptions;
        break;
      default: // bottlenecks
        items = bottlenecks;
        options = bottleneckSearchOptions;
    }

    if (items && items.length > 0) {
      setFuse(new Fuse(items, options));
    }
  }, [isMounted, viewType, bottlenecks, capabilities, resources]);

  // Determine which ready class to apply
  const viewReadyClass =
    viewMode === 'grid' && gridViewReady ? 'grid-view-ready' :
      viewMode === 'list' && listViewReady ? 'list-view-ready' :
        viewMode === 'graph' && graphViewReady ? 'graph-view-ready' : '';

  // Listen for view changes
  useEffect(() => {
    const handleViewChange = (event) => {
      // Update view type based on the new viewType or legacy isListView value
      if (event.detail.viewType) {
        setViewMode(event.detail.viewType);
      } else if (event.detail.isListView !== undefined) {
        setViewMode(event.detail.isListView ? 'list' : 'grid');
      } else if (event.detail.isGraphView !== undefined) {
        if (event.detail.isGraphView) {
          setViewMode('graph');
        }
      }
    };

    window.addEventListener('view-changed', handleViewChange);

    return () => {
      window.removeEventListener('view-changed', handleViewChange);
    };
  }, []);

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
      // Also update the shared store when field selections change
      updateSelectedFields(event.detail.selectedFields);
    };

    window.addEventListener('fields-changed', handleFieldChange);

    return () => {
      window.removeEventListener('fields-changed', handleFieldChange);
    };
  }, []);

  // Listen for changes in the shared field store
  useEffect(() => {
    if (!isMounted) return;

    const unsubscribe = sharedFieldStore.subscribe((state) => {
      if (state.selectedFields &&
        JSON.stringify(state.selectedFields) !== JSON.stringify(selectedFields)) {
        setSelectedFields(state.selectedFields);
      }
    });

    return unsubscribe;
  }, [isMounted, selectedFields]);

  useEffect(() => {
    if (!isMounted) return;

    try {
      // First check for user preferences
      if (typeof window !== 'undefined' && window.userPreferences) {
        const userViewType = window.userPreferences.viewType;
        if (userViewType && userViewType !== viewMode) {
          console.log("Initializing with saved view type:", userViewType);
          setViewMode(userViewType);
        }
      }
    } catch (e) {
      console.error('Error loading view preference:', e);
    }
  }, [isMounted]);

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

    let filteredResults;
    
    // Get the correct collection of items based on viewType
    const items = viewType === 'bottlenecks' ? bottlenecks : 
                 viewType === 'capabilities' ? capabilities : 
                 resources;

    // Apply search
    filteredResults = currentSearchQuery
      ? fuse.search(currentSearchQuery).map(result => result.item)
      : items;

    // Apply field filtering - different for each view type
    if (selectedFields.length > 0) {
      if (viewType === 'bottlenecks') {
        // For bottlenecks, check if the bottleneck's field is selected
        filteredResults = filteredResults.filter(bottleneck =>
          bottleneck.field &&
          selectedFields.includes(bottleneck.field.id)
        );
      } else if (viewType === 'capabilities') {
        // For capabilities, check if any of its associated bottlenecks have a selected field
        filteredResults = filteredResults.filter(capability => {
          return capability.bottlenecks && capability.bottlenecks.some(bottleneck =>
            bottleneck.field && selectedFields.includes(bottleneck.field.id)
          );
        });
      } else if (viewType === 'resources') {
        // For resources, check fields through capability and bottleneck relationships
        filteredResults = filteredResults.filter(resource => {
          // Find capabilities linked to this resource
          const linkedCapabilities = capabilities.filter(capability => 
            capability.resources && capability.resources.some(r => r.id === resource.id)
          );
          
          // Check if any linked capabilities connect to bottlenecks with selected fields
          return linkedCapabilities.some(capability => {
            if (!capability.bottlenecks) return false;
            
            return capability.bottlenecks.some(bottleneck => 
              bottleneck.field && selectedFields.includes(bottleneck.field.id)
            );
          });
        });
      }
    }

    // Apply public tag filtering
    if (selectedTag) {
      filteredResults = filteredResults.filter(item =>
        item.tags && item.tags.includes(selectedTag)
      );
    }

    // Apply private tag filtering
    if (privateTag) {
      filteredResults = filteredResults.filter(item =>
        item.privateTags && item.privateTags.includes(privateTag)
      );
    }

    // Apply sorting based on viewType
    filteredResults = [...filteredResults].sort((a, b) => {
      if (viewType === 'bottlenecks') {
        // Bottlenecks sorting
        if (sortBy === 'alpha') {
          // Sort alphabetically by title
          return a.bottleneck_name.localeCompare(b.bottleneck_name);
        } else { // Default: 'rank'
          // Sort by rank (descending) with bottleneck_number as tiebreaker
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
      } else if (viewType === 'capabilities') {
        // Capabilities sorting
        if (sortBy === 'alpha') {
          // Sort alphabetically by fc_name
          return a.fc_name.localeCompare(b.fc_name);
        } else { // Default: 'bottlenecks'
          // Sort by number of bottlenecks (descending) with alphabetical fc_name as tiebreaker
          const countA = a.bottlenecks?.length || 0;
          const countB = b.bottlenecks?.length || 0;

          if (countA === countB) {
            return a.fc_name.localeCompare(b.fc_name);
          }

          return countB - countA; // Higher count first
        }
      } else if (viewType === 'resources') {
        // Resources sorting
        if (sortBy === 'alpha') {
          // Sort alphabetically by title
          return a.resource_title.localeCompare(b.resource_title);
        } else { // Default: 'type'
          // Sort by resource type first, then alphabetically by title
          const typeA = a.resourceTypes && a.resourceTypes[0] ? a.resourceTypes[0] : '';
          const typeB = b.resourceTypes && b.resourceTypes[0] ? b.resourceTypes[0] : '';
          
          const typeComparison = typeA.localeCompare(typeB);
          
          if (typeComparison === 0) {
            return a.resource_title.localeCompare(b.resource_title);
          }
          
          return typeComparison;
        }
      }
    });

    setFilteredItems(filteredResults);

    // Update network props if we're in graph view
    if (viewMode === 'graph') {
      setNetworkProps({
        bottlenecks: viewType === 'bottlenecks' ? filteredResults : bottlenecks,
        capabilities: viewType === 'capabilities' ? filteredResults : capabilities,
        resources: viewType === 'resources' ? filteredResults : resources,
        fields,
        searchQuery: currentSearchQuery,
        selectedFieldIds: selectedFields,
        selectedTag,
        privateTag,
        viewType
      });
    } else {
      setNetworkProps(null);
    }
  }, [
    isMounted,
    viewType,
    fuse,
    currentSearchQuery,
    selectedFields,
    selectedTag,
    privateTag,
    sortBy,
    bottlenecks,
    capabilities,
    resources,
    viewMode
  ]);

  // Attempt to restore scroll position after filtered items are updated
  useEffect(() => {
    // Only try to restore scroll if this is a back navigation to dashboard
    if (filteredItems.length > 0 && !hasRestoredScroll) {
      // Import and use scrollPositionUtils directly
      import('../../lib/scrollPositionUtils').then(({ isBackNavigationToDashboard, scrollToSavedPosition }) => {
        if (isBackNavigationToDashboard()) {
          // Wait a bit for the DOM to update
          setTimeout(() => {
            scrollToSavedPosition(filteredItems);
            setHasRestoredScroll(true);
          }, 100);
        }
      });
    }
  }, [filteredItems, hasRestoredScroll]);

  // Determine grid class based on view mode
  const gridClass = `bottleneck-grid ${
    isMounted && viewMode === 'list' ? 'bottleneck-grid--list-view' : ''
  } ${
    isMounted && viewMode === 'graph' ? 'bottleneck-grid--graph-view' : ''
  } ${viewReadyClass}`;

  // Function to render resources grouped by type
  const renderResourcesGroupedByType = () => {
    // Group resources by type
    const resourcesByType = {};
    
    filteredItems.forEach(resource => {
      const resourceType = resource.resourceTypes && resource.resourceTypes[0] 
        ? resource.resourceTypes[0] 
        : 'Other';
      
      if (!resourcesByType[resourceType]) {
        resourcesByType[resourceType] = [];
      }
      resourcesByType[resourceType].push(resource);
    });
    
    // Convert to array of entries and sort by type name
    const sortedTypes = Object.entries(resourcesByType).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Render each group with a header
    return sortedTypes.map(([resourceType, resources]) => (
      <div key={resourceType} className="resource-group">
        <div className="resource-group__items">
          {resources.map(resource => {
            // Get fields and capabilities linked to this resource
            const { linkedCapabilities, linkedFields } = getResourceRelationships(resource.id);
            
            return (
              <ResourceCard
                key={resource.id}
                resource={resource}
                searchQuery={currentSearchQuery}
                selectedFields={selectedFields}
                linkedCapabilities={linkedCapabilities}
                linkedFields={linkedFields}
              />
            );
          })}
        </div>
      </div>
    ));
  };

  // For the graph view, we will use window.NetworkViewWrapper 
  // This is a dynamic component that will be defined by Astro
  useEffect(() => {
    if (viewMode === 'graph' && networkProps && typeof window !== 'undefined') {
      // This will be filled in by Astro's build system when using client:only="react"
      if (window.NetworkViewWrapper) {
        const root = document.getElementById('network-view-container');
        if (root) {
          window.NetworkViewWrapper(root, networkProps);
        }
      }
    }
  }, [viewMode, networkProps]);

  return (
    <>
      {/* Show loading indicator when view isn't ready */}
      {((viewMode === 'grid' && !gridViewReady) ||
        (viewMode === 'list' && !listViewReady) ||
        (viewMode === 'graph' && !graphViewReady)) && (
          <div className="dashboard-loading">
            <div>Loading {viewMode} view</div>
          </div>
        )}
        
      <div className={gridClass}>
        {viewMode === 'graph' ? (
          // We'll use a placeholder div that will be filled by Astro
          <div id="network-view-container" className="network-graph">
            {/* If using D3 directly as fallback */}
            {isMounted && (
              <IntegratedNetworkView
                bottlenecks={viewType === 'bottlenecks' ? filteredItems : bottlenecks}
                capabilities={viewType === 'capabilities' ? filteredItems : capabilities}
                resources={viewType === 'resources' ? filteredItems : resources}
                fields={fields}
                searchQuery={currentSearchQuery}
                selectedFieldIds={selectedFields}
                selectedTag={selectedTag}
                privateTag={privateTag}
                viewType={viewType}
              />
            )}
          </div>
        ) : (
          // Render cards based on viewType
          viewType === 'bottlenecks' ? (
            // Render bottleneck cards
            filteredItems.map((bottleneck) => (
              <BottleneckCard
                key={bottleneck.id}
                bottleneck={bottleneck}
                searchQuery={currentSearchQuery}
                selectedFields={selectedFields}
              />
            ))
          ) : viewType === 'capabilities' ? (
            // Render capability cards
            filteredItems.map((capability) => (
              <FoundationalCapabilityCard
                key={capability.id}
                capability={capability}
                searchQuery={currentSearchQuery}
                selectedFields={selectedFields}
              />
            ))
          ) : (
            // Render resource cards - grouping based on sort method
            sortBy === 'alpha' ? (
              // When sorting alphabetically, don't group resources (regardless of view mode)
              filteredItems.map(resource => {
                const { linkedCapabilities, linkedFields } = getResourceRelationships(resource.id);
                
                return (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    searchQuery={currentSearchQuery}
                    selectedFields={selectedFields}
                    linkedCapabilities={linkedCapabilities}
                    linkedFields={linkedFields}
                  />
                );
              })
            ) : (
              // When sorting by type, group resources by type (regardless of view mode)
              renderResourcesGroupedByType()
            )
          )
        )}

        {viewMode !== 'graph' && filteredItems.length === 0 && (
          <div className="bottleneck-grid__empty-state">
            <h3>No results found</h3>
            <p>
              We could not find any {
                viewType === 'bottlenecks' ? 'gaps' : 
                viewType === 'capabilities' ? 'capabilities' :
                'resources'
              } matching your search criteria.
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </div>
    </>
  );
}