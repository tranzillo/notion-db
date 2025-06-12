// src/components/standalone/ResourceCard.jsx
import React, { useState, useCallback, useEffect, memo } from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';
import cardHeightManager from '../../lib/cardHeightManager';
import FieldLabel from './FieldLabel'; // Import the new FieldLabel component

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
  
  // Create a unique card ID for height tracking
  const cardId = `resource-card-${resource.id}`;

  // Function to check if search query matches any content in the expanded section
  const shouldAutoExpand = useCallback(() => {
    if (!searchQuery || !linkedCapabilities || linkedCapabilities.length === 0) return false;
    
    // Don't re-check if already expanded
    if (isExpanded) return true;

    const lowerCaseQuery = searchQuery.toLowerCase();
    
    // Check if query matches any capability name
    return linkedCapabilities.some(capability => {
      // Check capability name
      if (capability.fc_name && capability.fc_name.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check capability's related bottlenecks if available
      if (capability.bottlenecks && Array.isArray(capability.bottlenecks)) {
        return capability.bottlenecks.some(bottleneck => 
          (bottleneck.bottleneck_name && bottleneck.bottleneck_name.toLowerCase().includes(lowerCaseQuery)) ||
          (bottleneck.field && bottleneck.field.field_name && 
           bottleneck.field.field_name.toLowerCase().includes(lowerCaseQuery))
        );
      }
      
      return false;
    });
  }, [searchQuery, linkedCapabilities, isExpanded]);

  // Auto-expand when search query matches expanded content
  useEffect(() => {
    if (searchQuery && shouldAutoExpand() && !isExpanded) {
      setIsExpanded(true);
      cardHeightManager.expandCard(cardId);
    }
  }, [searchQuery, shouldAutoExpand, isExpanded, cardId]);

  // Function to highlight search matches in text - memoize to avoid recalculation
  const highlightMatches = useCallback((text, query) => {
    if (!query || !text) return text;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch (e) {
      return text;
    }
  }, []);

  // Memoize title highlighting
  const highlightedTitle = React.useMemo(() => {
    if (!searchQuery || !resource.resource_title) return resource.resource_title;
    return highlightMatches(resource.resource_title, searchQuery);
  }, [searchQuery, resource.resource_title, highlightMatches]);

  // Memoize content preparation
  const processedContent = React.useMemo(() => {
    if (!resource.content) return '';
    
    // Truncate text
    const truncated = resource.content.length > 500 
      ? resource.content.substring(0, 500) + '...'
      : resource.content;
    
    // Add highlighting if needed
    if (!searchQuery) return truncated;
    
    return highlightMatches(truncated, searchQuery);
  }, [resource.content, searchQuery, highlightMatches]);

  // Toggle expanded state - use callback to ensure stable reference
  const toggleExpand = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsExpanded(prev => {
      const newExpandedState = !prev;
      
      // Use cardHeightManager to handle height changes
      if (newExpandedState) {
        cardHeightManager.expandCard(cardId);
      } else {
        cardHeightManager.collapseCard(cardId);
      }
      
      return newExpandedState;
    });
  }, [cardId]);

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
    <div className="resource-card" id={cardId}>
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
                    <a 
                      href={`/capabilities/${capability.slug}`} 
                      className="resource-card__capability-link"
                      dangerouslySetInnerHTML={{ 
                        __html: searchQuery ? 
                          highlightMatches(capability.fc_name, searchQuery) : 
                          capability.fc_name 
                      }}
                    />
                    {fieldsForCapability.length > 0 && (
                      <div className="resource-card__capability-fields">
                        {fieldsForCapability.map(field => (
                          <FieldLabel
                            key={field.id}
                            field={field}
                            isSelected={selectedFields.includes(field.id)}
                          />
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