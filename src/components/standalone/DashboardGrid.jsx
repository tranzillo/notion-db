// src/components/standalone/BottleneckGrid.jsx
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
    }
  ]
};

export default function BottleneckGrid({
  bottlenecks = [],
  initialSearchQuery = '',
  initialSelectedDisciplineIds = []
}) {
  // Always start with consistent state for SSR
  const [filteredBottlenecks, setFilteredBottlenecks] = useState(bottlenecks);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(initialSearchQuery);
  const [selectedDisciplines, setSelectedDisciplines] = useState(initialSelectedDisciplineIds);
  const [isListView, setIsListView] = useState(false);
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

  // Apply filtering when search or disciplines change
  useEffect(() => {
    if (!fuse) return;

    // Apply search
    let results = currentSearchQuery
      ? fuse.search(currentSearchQuery).map(result => result.item)
      : bottlenecks;

    // Apply discipline filtering
    if (selectedDisciplines.length > 0) {
      results = results.filter(bottleneck =>
        bottleneck.discipline &&
        selectedDisciplines.includes(bottleneck.discipline.id)
      );
    }

    setFilteredBottlenecks(results);
  }, [currentSearchQuery, selectedDisciplines, fuse, bottlenecks]);
  
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