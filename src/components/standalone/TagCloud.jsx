// src/components/standalone/TagCloud.jsx
import React, { useState, useEffect } from 'react';
import { saveCurrentUrlState } from '../../lib/navigationUtils';
import { createTagSlug } from '../../lib/tagUtils';

export default function TagCloud({ tags = [], initialSelectedTag = '' }) {
  const [selectedTag, setSelectedTag] = useState(initialSelectedTag);
  const [isVisible, setIsVisible] = useState(true);

  // Initialize state from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTag = params.get('tag');
      const privateTag = params.get('for');
      
      // Set selected tag if it exists in URL
      if (urlTag && urlTag !== selectedTag) {
        setSelectedTag(urlTag);
      }
      
      // Hide tag cloud if private tag is active
      setIsVisible(!privateTag);
    }
  }, []);

  // Listen for private tag changes
  useEffect(() => {
    const handlePrivateTagChange = (event) => {
      // If privateTag is cleared (becomes empty), show the tag cloud
      // If privateTag is set (not empty), hide the tag cloud
      setIsVisible(!event.detail.privateTag);
    };

    window.addEventListener('private-tag-changed', handlePrivateTagChange);

    return () => {
      window.removeEventListener('private-tag-changed', handlePrivateTagChange);
    };
  }, []);

  // Update URL when a tag is selected
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    
    if (selectedTag) {
      // Use the original tag name (not slugified) for display purposes
      params.set('tag', selectedTag);
    } else {
      params.delete('tag');
    }
    
    // Remove 'for' parameter if tag is selected (mutually exclusive)
    if (selectedTag && params.has('for')) {
      params.delete('for');
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('tag-changed', { 
      detail: { selectedTag } 
    }));
    
    // Save URL state for navigation
    saveCurrentUrlState();
  }, [selectedTag]);

  // Handle tag selection
  const handleTagClick = (tag) => {
    // If the tag is already selected, deselect it
    if (selectedTag === tag) {
      setSelectedTag('');
    } else {
      setSelectedTag(tag);
    }
  };

  // Don't render if no tags or if tag cloud should be hidden
  if (!tags.length || !isVisible) {
    return null;
  }

  return (
    <div className="tag-cloud">
      <div className="tag-cloud__header">
        <h3>Filter by Tag</h3>
      </div>
      
      <div className="tag-cloud__tags">
        {tags.map((tag) => (
          <button
            key={createTagSlug(tag)}
            className={`tag-cloud__tag ${selectedTag === tag ? 'active' : ''}`}
            onClick={() => handleTagClick(tag)}
            aria-pressed={selectedTag === tag}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}