// src/components/standalone/SortControl.jsx
import React, { useState, useEffect } from 'react';
import { updateUrlParamsWithoutHistory } from '../../lib/dataUtils';

export default function SortControl({ initialSortBy = 'rank' }) {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [viewType, setViewType] = useState('bottlenecks'); // Default to bottlenecks view

  // Initialize and determine the current view type
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      let currentViewType = 'bottlenecks'; // default
      let defaultSort = 'rank';

      if (path.startsWith('/capabilities')) {
        currentViewType = 'capabilities';
        defaultSort = 'bottlenecks';
      } else if (path.startsWith('/resources')) {
        currentViewType = 'resources';
        defaultSort = 'type';
      }

      setViewType(currentViewType);

      // Check URL parameters for sort value
      const params = new URLSearchParams(window.location.search);
      const urlSortBy = params.get('sort');

      // Get valid sort options based on view type
      const validSortOptions = getValidSortOptions(currentViewType);

      // If URL has a valid sort param, use it
      if (urlSortBy && validSortOptions.includes(urlSortBy)) {
        setSortBy(urlSortBy);
      } else {
        // Otherwise use the appropriate default for this view type
        setSortBy(defaultSort);
        
        // Update URL to match the default sort if needed
        if (!urlSortBy || !validSortOptions.includes(urlSortBy)) {
          updateUrlParamsWithoutHistory({ sort: defaultSort });
          
          // Also dispatch the event to notify other components
          window.dispatchEvent(new CustomEvent('sort-changed', {
            detail: { sortBy: defaultSort }
          }));
        }
      }
    }
  }, []);

  // Get valid sort options for the current view type
  const getValidSortOptions = (type) => {
    switch (type) {
      case 'capabilities':
        return ['bottlenecks', 'alpha'];
      case 'resources':
        return ['type', 'alpha'];
      default: // bottlenecks
        return ['rank', 'alpha'];
    }
  };

  // Get the next sort value when toggling
  const getNextSortValue = (currentSort) => {
    const options = getValidSortOptions(viewType);
    const currentIndex = options.indexOf(currentSort);
    
    if (currentIndex === -1) {
      // If current sort is invalid, use first option
      return options[0];
    }
    
    // Get next option, or loop back to first
    return options[(currentIndex + 1) % options.length];
  };

  // Handle toggle between sorting options
  const toggleSort = () => {
    const newSortBy = getNextSortValue(sortBy);
    setSortBy(newSortBy);

    // Update URL without creating history entry
    updateUrlParamsWithoutHistory({ sort: newSortBy });

    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('sort-changed', {
      detail: { sortBy: newSortBy }
    }));
  };

  // Get active status for display (based on whether alpha sort is active)
  const isAlphaSortActive = sortBy === 'alpha';

  // Get appropriate aria-label and title based on view and current sort
  const getButtonLabels = () => {
    if (viewType === 'capabilities') {
      return {
        ariaLabel: sortBy === 'bottlenecks' ? "Sort alphabetically" : "Sort by bottleneck count",
        title: sortBy === 'bottlenecks' ? "Sort alphabetically" : "Sort by bottleneck count"
      };
    } else if (viewType === 'resources') {
      return {
        ariaLabel: sortBy === 'type' ? "Sort alphabetically" : "Sort by resource type",
        title: sortBy === 'type' ? "Sort alphabetically" : "Sort by resource type"
      };
    } else {
      return {
        ariaLabel: sortBy === 'alpha' ? "Sort by rank" : "Sort alphabetically",
        title: sortBy === 'alpha' ? "Sort by rank" : "Sort alphabetically"
      };
    }
  };

  const { ariaLabel, title } = getButtonLabels();

  return (
    <div className="sort-control">
      <button
        className={`sort-control__button ${isAlphaSortActive ? 'active' : ''}`}
        onClick={toggleSort}
        aria-label={ariaLabel}
        title={title}
      >
        {/* Always show the alphabetical sorting icon, only the active state changes */}
        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="24" viewBox="0 0 37 44" fill="none">
          <path d="M7.26483 0V39.605L1.15064 33.4482L0 35.105L7.52689 42.8422C7.6098 42.9251 7.70902 42.9907 7.81919 43.0361C7.92881 43.0814 8.04523 43.1052 8.16197 43.1052C8.27871 43.1052 8.39513 43.0814 8.50475 43.0362C8.61493 42.9907 8.71415 42.9251 8.79705 42.8422L16.5 35.1584L15.2308 33.4482L9.05912 39.6051V0H7.26483Z" fill="black" />
          <path d="M35 43H18V41.47L31.3301 27.768H18.6066V26H34.7574V27.6433L21.5486 41.232H35V43Z" fill="black" />
          <path d="M18.7321 20H16L25.097 0H27.9177L37 20H34.2679L31.8608 14.6H21.1392L18.7321 20ZM22.0549 12.52H30.9451L26.5 2.53333L22.0549 12.52Z" fill="black" />
        </svg>
      </button>
    </div>
  );
}