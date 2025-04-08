// src/components/standalone/FoundationalCapabilityCard.jsx
import React, { useState, useEffect } from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';

export default function FoundationalCapabilityCard({
  capability,
  searchQuery = '',
  selectedFields = [],
  truncateLength = 500,
  showResources = false // Add a prop to optionally show resources
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

  // Truncate text
  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get all unique fields from associated bottlenecks
  const getAllFields = () => {
    if (!capability.bottlenecks || !Array.isArray(capability.bottlenecks)) return [];

    const fieldMap = new Map();
    capability.bottlenecks.forEach(bottleneck => {
      if (bottleneck.field && bottleneck.field.id) {
        fieldMap.set(bottleneck.field.id, bottleneck.field);
      }
    });

    return Array.from(fieldMap.values());
  };

  // Get all fields
  const allFields = getAllFields();

  // Check if any field is selected
  const hasFieldSelected = allFields.some(field =>
    selectedFields.includes(field.id)
  );

  // Get tags for display
  const tags = capability.tags || [];

  // Sort resources if they exist
  const sortedResources = React.useMemo(() => {
    if (!capability.resources || !Array.isArray(capability.resources)) {
      return [];
    }
    
    return [...capability.resources].sort((a, b) => {
      // First sort by resource type (alphabetically)
      const aType = a.resourceTypes?.[0] || '';
      const bType = b.resourceTypes?.[0] || '';
      
      const typeComparison = aType.localeCompare(bType);
      
      // If types are the same, sort by title
      if (typeComparison === 0) {
        return a.resource_title.localeCompare(b.resource_title);
      }
      
      return typeComparison;
    });
  }, [capability.resources]);

  // Prepare content
  const capabilityUrl = `/capabilities/${capability.slug}`;

  // Make sure we're working with string content
  const contentString = capability.fc_description || '';

  const truncatedContent = truncateText(contentString, truncateLength);
  const displayTitle = searchQuery ? highlightMatches(capability.fc_name, searchQuery) : capability.fc_name;
  const displayContent = searchQuery ? highlightMatches(truncatedContent, searchQuery) : truncatedContent;

  // Handle click to save position
  const handleCardClick = () => {
    saveScrollPosition(capability.id, capability.slug, window.location.pathname);
  };

  return (
    <div className="capability-card capability-card--grid" id={`capability-card-${capability.id}`}>
      <a
        href={capabilityUrl}
        className="capability-card__clickable"
        onClick={handleCardClick}
        aria-labelledby={`card-title-${capability.id}`}
      />
      <div className="capability-card__header">
        <h2 className="capability-card__title">
          <a
            href={capabilityUrl}
            dangerouslySetInnerHTML={{ __html: displayTitle }}
            onClick={handleCardClick}
            id={`card-title-${capability.id}`}
          />
        </h2>
      </div>

      <div className="capability-card__content">
        <div dangerouslySetInnerHTML={{ __html: displayContent }} />
      </div>

      {/* Show resources if prop is true and resources exist */}
      {showResources && sortedResources.length > 0 && (
  <div className="capability-card__resources">
    {(() => {
      // Group resources by type
      const resourcesByType = {};
      
      sortedResources.forEach(resource => {
        const resourceType = resource.resourceTypes?.[0] || 'Other';
        if (!resourcesByType[resourceType]) {
          resourcesByType[resourceType] = [];
        }
        resourcesByType[resourceType].push(resource);
      });
      
      // Render each group with a wrapper
      return Object.entries(resourcesByType).map(([resourceType, resources]) => (
        <div 
          key={`resource-group-${resourceType}`} 
          className="capability-card__resource-group" 
          data-resource-type={resourceType}
        >
          <div className="capability-card__resource-group-items">
            {resources.map((resource, index) => (
              <div key={`resource-${index}`} className="capability-card__resource-item">
                <div className="capability-card__resource-link">
                  {resource?.resource_url ? (
                    <a
                      href={resource.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {resource.resource_title}
                    </a>
                  ) : (
                    <span>{resource?.resource_title || "Untitled Resource"}</span>
                  )}
                  {resource?.resourceTypes && resource.resourceTypes.length > 0 && (
                    <div className="capability-card__resource-types">
                      {resource.resourceTypes.map((type, idx) => (
                        <span 
                          key={`type-${idx}`}
                          className={`capability-card__resource-type resource-type-gradient-${type.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {type}
                          {idx < resource.resourceTypes.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ));
    })()}
  </div>
)}

      <div className="capability-card__footer">
        <div className="capability-card__footer-left">
          {/* Display public tags */}
          {tags.length > 0 && (
            <div className="capability-card__tags">
              {tags.map((tag, index) => (
                <span key={index} className="capability-card__tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {allFields.length > 0 && (
            <div className="capability-card__fields">
              {allFields.map(field => (
                <div
                  key={field.id}
                  className={`capability-card__field ${selectedFields.includes(field.id) ? 'active' : ''} ${field.colorClass || ''}`}
                >
                  {field.field_name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="capability-card__footer-right">
          <div className="capability-card__bottlenecks-count">
            {(() => {
              const count = capability.bottlenecks?.length || 0;
              return `${count} ${count === 1 ? 'R&D Gap' : 'R&D Gaps'}`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}