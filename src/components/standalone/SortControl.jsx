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
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 50 50">
<path d="M10.4932 0.419434C9.94043 0.419434 9.49316 0.867188 9.49316 1.41943V46.1665L2.61426 39.2876C2.22363 38.897 1.59082 38.897 1.2002 39.2876C0.80957 39.6782 0.80957 40.311 1.2002 40.7017L9.78528 49.2867C9.87769 49.3793 9.98828 49.4526 10.1111 49.5034C10.2333 49.554 10.363 49.5806 10.4932 49.5806C10.6233 49.5806 10.7531 49.554 10.8752 49.5035C10.998 49.4526 11.1086 49.3793 11.201 49.2867L19.7871 40.7017C20.1777 40.311 20.1777 39.6782 19.7871 39.2876C19.3965 38.897 18.7637 38.897 18.373 39.2876L11.4932 46.1667V1.41943C11.4932 0.867188 11.0459 0.419434 10.4932 0.419434Z" fill="black"/>
<path d="M25.0039 32.5845L27.897 24.9663H38.2652L41.1582 32.5845C41.3096 32.9839 41.6895 33.23 42.0928 33.23C42.211 33.23 42.3311 33.2085 42.4483 33.1646C42.9639 32.9683 43.2237 32.3906 43.0274 31.8745L34.0156 8.14355C33.8682 7.75537 33.4961 7.49854 33.0811 7.49854C32.666 7.49854 32.294 7.75537 32.1465 8.14355L26.2884 23.5701C26.2857 23.5762 26.2838 23.5823 26.2813 23.5886L23.1348 31.8745C22.9385 32.3906 23.1983 32.9683 23.7139 33.1646C24.2315 33.3589 24.8086 33.1011 25.0039 32.5845ZM33.0811 11.3154L37.5056 22.9663H28.6565L33.0811 11.3154Z" fill="black"/>
</svg>
      </button>
    </div>
  );
}