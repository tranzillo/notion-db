// src/components/standalone/ResourceCard.jsx
import React, { useState, useEffect } from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';

export default function ResourceCard({
  resource,
  searchQuery = '',
  selectedFields = [],
  linkedCapabilities = [],
  linkedFields = []
}) {
  // Function to highlight search matches in text
  const highlightMatches = (text, query) => {
    if (!query || !text) return text;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch (e) {
      return text;
    }
  };

  // Prepare display title with search highlighting
  const displayTitle = searchQuery
    ? highlightMatches(resource.resource_title, searchQuery)
    : resource.resource_title;

  // Get primary resource type (first in the array)
  const primaryResourceType = resource.resourceTypes && resource.resourceTypes.length > 0
    ? resource.resourceTypes[0]
    : 'Publication';

  // Derive the resource type class for styling
  const resourceTypeClass = `resource-type-gradient-${primaryResourceType.toLowerCase().replace(/\s+/g, '-')}`;

  // Handle click to save position for scroll restoration
  const handleCardClick = () => {
    saveScrollPosition(resource.id, '', window.location.pathname);
  };

  return (
    <div className="resource-card" id={`resource-card-${resource.id}`}>
      <div className="resource-card__header">
        <div className={`resource-card__type ${resourceTypeClass}`}>
          {primaryResourceType}
        </div>
        <h2 className="resource-card__title">
          {resource.resource_url ? (
            <a 
              href={resource.resource_url} 
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCardClick}
              dangerouslySetInnerHTML={{ __html: displayTitle }}
            />
          ) : (
            <span dangerouslySetInnerHTML={{ __html: displayTitle }} />
          )}
        </h2>
      </div>

      {resource.content && (
        <div className="resource-card__content">
          <div dangerouslySetInnerHTML={{ __html: resource.content }} />
        </div>
      )}

    </div>
  );
}