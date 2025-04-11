// src/components/standalone/ResourceCard.jsx
import React, { useState, useCallback, memo } from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';

// Use memo to prevent unnecessary re-renders
const ResourceCard = memo(function ResourceCard({
  resource,
  searchQuery = '',
  selectedFields = [],
  linkedCapabilities = [],
  linkedFields = []
}) {
  // State to track expanded/collapsed view
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to highlight search matches in text - memoize to avoid recalculation
  const highlightedTitle = React.useMemo(() => {
    if (!searchQuery || !resource.resource_title) return resource.resource_title;
    try {
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return resource.resource_title.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch (e) {
      return resource.resource_title;
    }
  }, [searchQuery, resource.resource_title]);

  // Memoize content preparation
  const processedContent = React.useMemo(() => {
    if (!resource.content) return '';
    
    // Truncate text
    const truncated = resource.content.length > 300 
      ? resource.content.substring(0, 300) + '...'
      : resource.content;
    
    // Add highlighting if needed
    if (!searchQuery) return truncated;
    
    try {
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return truncated.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch (e) {
      return truncated;
    }
  }, [resource.content, searchQuery]);

  // Toggle expanded state - use callback to ensure stable reference
  const toggleExpand = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  // Get primary resource type once
  const primaryResourceType = resource.resourceTypes && resource.resourceTypes.length > 0
    ? resource.resourceTypes[0]
    : 'Publication';

  const resourceTypeClass = `resource-type-gradient-${primaryResourceType.toLowerCase().replace(/\s+/g, '-')}`;

  // Handle click to save position
  const handleCardClick = useCallback(() => {
    saveScrollPosition(resource.id, '', window.location.pathname);
  }, [resource.id]);

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
              dangerouslySetInnerHTML={{ __html: highlightedTitle }}
            />
          ) : (
            <span dangerouslySetInnerHTML={{ __html: highlightedTitle }} />
          )}
        </h2>
      </div>

      {processedContent && (
        <div className="resource-card__content">
          <div dangerouslySetInnerHTML={{ __html: processedContent }} />
        </div>
      )}

      <div className="resource-card__footer">
        <div className="resource-card__footer-right">
          {linkedCapabilities.length > 0 && (
            <button 
              onClick={toggleExpand}
              className="resource-card__capabilities-button"
              aria-expanded={isExpanded}
              aria-label={`Show ${linkedCapabilities.length} related capabilities`}
            >
              <span className="resource-card__capabilities-count">
                {linkedCapabilities.length} {linkedCapabilities.length === 1 ? 'Capability' : 'Capabilities'}
              </span>
              <span className="resource-card__capabilities-icon">
                {isExpanded ? '▲' : '▼'}
              </span>
            </button>
          )}
        </div>
      </div>

      {isExpanded && linkedCapabilities.length > 0 && (
        <div className="resource-card__capabilities-expanded">
          <div className="resource-card__capabilities-container">
            <ul className="resource-card__capabilities-list">
              {linkedCapabilities.map(capability => {
                // Find fields associated with this specific capability
                const fieldsForCapability = capability.bottlenecks?.reduce((acc, bottleneck) => {
                  if (bottleneck.field && !acc.some(f => f.id === bottleneck.field.id)) {
                    acc.push(bottleneck.field);
                  }
                  return acc;
                }, []) || [];
                
                return (
                  <li key={capability.id} className="resource-card__capability-item">
                    <a href={`/capabilities/${capability.slug}`} className="resource-card__capability-link">
                      {capability.fc_name}
                    </a>
                    {fieldsForCapability.length > 0 && (
                      <div className="resource-card__capability-fields">
                        {fieldsForCapability.map(field => (
                          <div
                            key={field.id}
                            className={`resource-card__field ${selectedFields.includes(field.id) ? 'active' : ''} ${field.colorClass || ''}`}
                          >
                            {field.field_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
});

export default ResourceCard;