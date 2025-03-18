import React, { useState, useEffect } from 'react';
import { saveCurrentUrlState } from '../../lib/navigationUtils';

export default function Search({ initialQuery = '' }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateUrlParams(searchQuery);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    updateUrlParams('');
    
    // Force save an empty state to session storage
    // This is critical when clearing the search
    saveCurrentUrlState(true);
  };

  // Update URL parameters
  const updateUrlParams = (query) => {
    const params = new URLSearchParams(window.location.search);
    
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
    
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('search-changed', { detail: { query } }));
  };

  // Apply initial query on first render
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
    
    // Also check URL parameters directly on mount
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q');
    if (urlQuery && urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, []);

  // Set up debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrlParams(searchQuery);
      
      // If search is empty or has been cleared, force save empty state
      // Otherwise just save current state
      if (!searchQuery) {
        saveCurrentUrlState(true);
      } else {
        saveCurrentUrlState();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="search-bar">
      <form className="search-bar__form" onSubmit={handleSearchSubmit}>
        <span className="search-bar__icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input
          type="text"
          name="q"
          className="search-bar__input"
          placeholder="Search bottlenecks..."
          value={searchQuery}
          onChange={handleSearchChange}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}