// src/components/standalone/SortControl.jsx
import React, { useState, useEffect } from 'react';
import { updateUrlParamsWithoutHistory } from '../../lib/dataUtils';

export default function SortControl({ initialSortBy = 'rank' }) {
  const [sortBy, setSortBy] = useState(initialSortBy);

  // Handle toggle between rank and alphabetical sorting
  const toggleSort = () => {
    const newSortBy = sortBy === 'rank' ? 'alpha' : 'rank';
    setSortBy(newSortBy);

    // Update URL without creating history entry
    updateUrlParamsWithoutHistory({ sort: newSortBy });

    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('sort-changed', {
      detail: { sortBy: newSortBy }
    }));
  };

  // Apply initial sort method on first render
  useEffect(() => {
    if (initialSortBy) {
      setSortBy(initialSortBy);
    }

    // Also check URL parameters directly on mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSortBy = params.get('sort');
      if (urlSortBy && ['rank', 'alpha'].includes(urlSortBy) && urlSortBy !== sortBy) {
        setSortBy(urlSortBy);
      }
    }
  }, []);

  return (
    <div className="sort-control">
      <button
        className={`sort-control__button ${sortBy === 'alpha' ? 'active' : ''}`}
        onClick={toggleSort}
        aria-label={sortBy === 'alpha' ? "Sort by rank" : "Sort alphabetically"}
        title={sortBy === 'alpha' ? "Sort by rank" : "Sort alphabetically"}
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