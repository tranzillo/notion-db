// src/components/standalone/FoundationalCapabilityCard.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';
import cardHeightManager from '../../lib/cardHeightManager';
import FieldLabel from './FieldLabel'; // Import the new FieldLabel component

export default function FoundationalCapabilityCard({
  capability,
  searchQuery = '',
  selectedFields = [],
  truncateLength = 1000,
  showResources = false
}) {
  // State for expanded/collapsed view
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Create a unique card ID for height tracking
  const cardId = `capability-card-${capability.id}`;
  
  // Function to check if search query matches any content in the expanded section
  const shouldAutoExpand = useCallback(() => {
    if (!searchQuery || !capability.bottlenecks) return false;
    
    // Don't re-check if already expanded
    if (isExpanded) return true;

    const lowerCaseQuery = searchQuery.toLowerCase();
    
    // Check if query matches any bottleneck name or description
    return capability.bottlenecks.some(bottleneck => {
      // Check bottleneck name
      if (bottleneck.bottleneck_name && bottleneck.bottleneck_name.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check bottleneck description
      if (bottleneck.bottleneck_description && bottleneck.bottleneck_description.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check bottleneck field
      if (bottleneck.field && bottleneck.field.field_name && 
          bottleneck.field.field_name.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      return false;
    });
  }, [searchQuery, capability.bottlenecks, isExpanded]);

  // Auto-expand when search query matches expanded content
  useEffect(() => {
    if (searchQuery && shouldAutoExpand() && !isExpanded) {
      setIsExpanded(true);
      cardHeightManager.expandCard(cardId);
    }
  }, [searchQuery, shouldAutoExpand, isExpanded, cardId]);
  
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

  // Toggle expanded state with height management
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

  // Calculate counts
  const bottleneckCount = capability.bottlenecks?.length || 0;
  const resourceCount = capability.resources?.length || 0;

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
    <div className="capability-card__outer-wrap">
    <div className="capability-card capability-card--grid" id={cardId}>
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
                <FieldLabel
                  key={field.id}
                  field={field}
                  isSelected={selectedFields.includes(field.id)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="capability-card__footer-right">
          <div className="capability-card__footer-right-container">
            {bottleneckCount > 0 && (
              <button 
                onClick={toggleExpand}
                className="capability-card__bottlenecks-button"
                aria-expanded={isExpanded}
                aria-label={`Show ${bottleneckCount} related R&D Gaps`}
              >
                <span className="capability-card__bottlenecks-count">
                  {bottleneckCount} {bottleneckCount === 1 ? 'R&D Gap' : 'R&D Gaps'}
                </span>
                <span className="capability-card__bottlenecks-icon">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded bottlenecks section */}
      {isExpanded && bottleneckCount > 0 && (
        <div className="capability-card__bottlenecks-expanded">
          <div className="capability-card__bottlenecks-container">
            <ul className="capability-card__bottlenecks-list">
              {capability.bottlenecks.map(bottleneck => (
                <li key={bottleneck.id} className="capability-card__bottleneck-item">
                  <a 
                    href={`/gaps/${bottleneck.slug}`} 
                    className="capability-card__bottleneck-link"
                    dangerouslySetInnerHTML={{ 
                      __html: searchQuery ? 
                        highlightMatches(bottleneck.bottleneck_name, searchQuery) : 
                        bottleneck.bottleneck_name 
                    }}
                  />
                  {/* Show field information */}
                  {bottleneck.field && (
                    <FieldLabel
                      field={bottleneck.field}
                      isSelected={selectedFields.includes(bottleneck.field.id)}
                    />
                  )}
                  {/* Add rank if available */}
                  {bottleneck.bottleneck_rank > 0 && (
                    <div className="capability-card__bottleneck-rank">
                      Urgency: {bottleneck.bottleneck_rank}/5
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}