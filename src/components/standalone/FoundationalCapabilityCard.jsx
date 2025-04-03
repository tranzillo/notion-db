// src/components/standalone/FoundationalCapabilityCard.jsx
import React from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';

export default function FoundationalCapabilityCard({
  capability,
  searchQuery = '',
  selectedFields = [],
  truncateLength = 500
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

  // Prepare content
  const capabilityUrl = `/capabilities/${capability.slug}`;
  
  // Make sure we're working with string content
  const contentString = capability.fc_description || '';
    
  const truncatedContent = truncateText(contentString, truncateLength);
  const displayTitle = searchQuery ? highlightMatches(capability.fc_name, searchQuery) : capability.fc_name;
  const displayContent = searchQuery ? highlightMatches(truncatedContent, searchQuery) : truncatedContent;

  // Handle click to save position
  const handleCardClick = () => {
    saveScrollPosition(capability.id, capability.slug);
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
            {capability.bottlenecks?.length || 0} Bottlenecks
          </div>
        </div>
      </div>
    </div>
  );
}