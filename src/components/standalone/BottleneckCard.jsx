// src/components/standalone/BottleneckCard.jsx
import React, { useState, useEffect } from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';
import RankIndicator from '../../components/standalone/RankIndicator';

export default function BottleneckCard({
  bottleneck,
  searchQuery = '',
  selectedFields = [],
  truncateLength = 500
}) {
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

  // Check if field is selected
  const isFieldSelected = bottleneck.field &&
    selectedFields.includes(bottleneck.field.id);

  // Prepare the content
  const bottleneckUrl = `/bottlenecks/${bottleneck.slug}`;
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
    saveScrollPosition(bottleneck.id, bottleneck.slug);
  };

  // Get tags for display
  const tags = bottleneck.tags || [];

  // Check if we have a valid rank to display
  const hasRank = bottleneck.bottleneck_rank !== undefined && bottleneck.bottleneck_rank !== null && bottleneck.bottleneck_rank > 0;

  return (
    <div
      className="bottleneck-card"
      id={`bottleneck-card-${bottleneck.id}`}
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
          />
        </h2>
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
          {bottleneck.field && bottleneck.field.field_name && (
            <div className={`bottleneck-card__field ${isFieldSelected ? 'active' : ''} ${bottleneck.field.colorClass || ''}`}>
              {bottleneck.field.field_name}
            </div>
          )}
        </div>
        <div className="bottleneck-card__footer-right">
          <div className="bottleneck-card__footer-right-container">
            {/* Only render the rank indicator if there's a valid rank */}
            {hasRank && <RankIndicator rank={bottleneck.bottleneck_rank} />}
            {/* Display bottleneck number if it exists */}
            {bottleneck.bottleneck_number !== undefined && bottleneck.bottleneck_number > 0 && (
              <div className="bottleneck-card__index">
                #{bottleneck.bottleneck_number}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}