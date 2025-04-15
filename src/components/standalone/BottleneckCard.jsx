// src/components/standalone/BottleneckCard.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';
import RankIndicator from './RankIndicator';
import cardHeightManager from '../../lib/cardHeightManager';
import FieldLabel from './FieldLabel'; // Import the new FieldLabel component

export default function BottleneckCard({
  bottleneck,
  searchQuery = '',
  selectedFields = [],
  truncateLength = 500
}) {
  // State for tracking expanded/collapsed view
  const [isExpanded, setIsExpanded] = useState(false);

  // Create a unique card ID for height tracking
  const cardId = `bottleneck-card-${bottleneck.id}`;

  // Function to check if search query matches any content in the expanded section
  const shouldAutoExpand = useCallback(() => {
    if (!searchQuery || !bottleneck.foundational_capabilities) return false;
    
    // Don't re-check if already expanded
    if (isExpanded) return true;

    const lowerCaseQuery = searchQuery.toLowerCase();
    
    // Check if query matches any capability name or description
    return bottleneck.foundational_capabilities.some(capability => {
      // Check capability name
      if (capability.fc_name && capability.fc_name.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check capability description
      if (capability.fc_description && capability.fc_description.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      
      // Check related resources if they exist
      if (capability.resources && Array.isArray(capability.resources)) {
        return capability.resources.some(resource => 
          (resource.resource_title && resource.resource_title.toLowerCase().includes(lowerCaseQuery)) ||
          (resource.content && resource.content.toLowerCase().includes(lowerCaseQuery))
        );
      }
      
      return false;
    });
  }, [searchQuery, bottleneck.foundational_capabilities, isExpanded]);

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
      // Create a regex to find the query in the text (case insensitive)
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

      // Replace matches with highlighted version
      return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch (e) {
      // If regex fails, return unchanged
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
        
        // Dispatch event to notify parent components that this card expanded
        window.dispatchEvent(new CustomEvent('card-expanded', {
          detail: { cardId }
        }));
      } else {
        cardHeightManager.collapseCard(cardId);
        
        // Dispatch event to notify parent components that this card collapsed
        window.dispatchEvent(new CustomEvent('card-collapsed', {
          detail: { cardId }
        }));
      }
  
      return newExpandedState;
    });
  }, [cardId]);

  // Check if field is selected
  const isFieldSelected = bottleneck.field &&
    selectedFields.includes(bottleneck.field.id);

  // Prepare the content
  const bottleneckUrl = `/gaps/${bottleneck.slug}`;
  const truncatedContent = truncateText(bottleneck.bottleneck_description || '', truncateLength);

  // Apply highlighting if search query exists
  const displayTitle = searchQuery
    ? highlightMatches(bottleneck.bottleneck_name, searchQuery)
    : bottleneck.bottleneck_name;

  const displayContent = searchQuery
    ? highlightMatches(truncatedContent, searchQuery)
    : truncatedContent;

  // Handle click to save position information
  const handleCardClick = () => {
    saveScrollPosition(bottleneck.id, bottleneck.slug, window.location.pathname);
  };

  // Get tags for display
  const tags = bottleneck.tags || [];

  // Check if we have a valid rank to display
  const hasRank = bottleneck.bottleneck_rank !== undefined && bottleneck.bottleneck_rank !== null && bottleneck.bottleneck_rank > 0;

  // Count capabilities
  const capabilityCount = bottleneck.foundational_capabilities?.length || 0;

  return (
    <div className="bottleneck-card__outer-wrap">
      <div
        className="bottleneck-card"
        id={cardId}
      >
        <a
          href={bottleneckUrl}
          className="bottleneck-card__clickable"
          onClick={handleCardClick}
          aria-labelledby={`card-title-${bottleneck.id}`}
        />
        <div className="bottleneck-card__header">
          <h2 className="bottleneck-card__title">
            <a
              href={bottleneckUrl}
              dangerouslySetInnerHTML={{ __html: displayTitle }}
              onClick={handleCardClick}
              id={`card-title-${bottleneck.id}`}
            />
          </h2>
          {bottleneck.field && (
            <div className="hide-list">
              <FieldLabel 
                field={bottleneck.field}
                isSelected={isFieldSelected}
              />
            </div>
          )}
        </div>

        <div className="bottleneck-card__content">
          <div dangerouslySetInnerHTML={{ __html: displayContent }} />
        </div>

        <div className="bottleneck-card__footer">
          <div className="bottleneck-card__footer-left">
            {/* Display public tags */}
            {tags.length > 0 && (
              <div className="bottleneck-card__tags">
                {tags.map((tag, index) => (
                  <span key={index} className="bottleneck-card__tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {bottleneck.field && (
              <div className="hide-grid">
                <FieldLabel 
                  field={bottleneck.field}
                  isSelected={isFieldSelected}
                />
              </div>
            )}
            {/* Only render the rank indicator if there's a valid rank */}
            {hasRank && <RankIndicator rank={bottleneck.bottleneck_rank} />}
            {/* Display bottleneck number if it exists */}
            {bottleneck.bottleneck_number !== undefined && bottleneck.bottleneck_number > 0 && (
              <div className="bottleneck-card__index">
                {bottleneck.bottleneck_number}
              </div>
            )}
          </div>
          <div className="bottleneck-card__footer-right">
            <div className="bottleneck-card__footer-right-container">

              {/* Add capability count button */}
              {capabilityCount > 0 && (
                <button
                  onClick={toggleExpand}
                  className="bottleneck-card__capabilities-button"
                  aria-expanded={isExpanded}
                  aria-label={`Show ${capabilityCount} related capabilities`}
                >
                  <span className="bottleneck-card__capabilities-count">
                    {capabilityCount} {capabilityCount === 1 ? 'Capability' : 'Capabilities'}
                  </span>
                  <span className="bottleneck-card__capabilities-icon">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded capabilities section */}
        {isExpanded && capabilityCount > 0 && (
          <div className="bottleneck-card__capabilities-expanded">
            <div className="bottleneck-card__capabilities-container">
              <ul className="bottleneck-card__capabilities-list">
                {bottleneck.foundational_capabilities.map(capability => (
                  <li key={capability.id} className="bottleneck-card__capability-item">
                    <a 
                      href={`/capabilities/${capability.slug}`} 
                      className="bottleneck-card__capability-link"
                      dangerouslySetInnerHTML={{ 
                        __html: searchQuery ? 
                          highlightMatches(capability.fc_name, searchQuery) : 
                          capability.fc_name 
                      }}
                    />
                    {/* Show resource count if available */}
                    {capability.resources && capability.resources.length > 0 && (
                      <div className="bottleneck-card__capability-resources">
                        {capability.resources.length} {capability.resources.length === 1 ? 'Resource' : 'Resources'}
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