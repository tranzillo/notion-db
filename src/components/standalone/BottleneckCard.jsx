import React from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';
import RankIndicator from '../../components/standalone/RankIndicator';

export default function BottleneckCard({
  bottleneck,
  searchQuery = '',
  selectedDisciplines = [],
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

  // Check if discipline is selected
  const isDisciplineSelected = bottleneck.discipline &&
    selectedDisciplines.includes(bottleneck.discipline.id);

  // Prepare the content
  const bottleneckUrl = `/bottlenecks/${bottleneck.slug}`;
  const truncatedContent = truncateText(bottleneck.content, truncateLength);

  // Apply highlighting if search query exists
  const displayTitle = searchQuery
    ? highlightMatches(bottleneck.title, searchQuery)
    : bottleneck.title;

  const displayContent = searchQuery
    ? highlightMatches(truncatedContent, searchQuery)
    : truncatedContent;

  // Handle click to save position information
  const handleCardClick = () => {
    saveScrollPosition(bottleneck.id, bottleneck.slug);
  };

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
          {bottleneck.discipline && bottleneck.discipline.title && (
            <div className={`bottleneck-card__discipline ${isDisciplineSelected ? 'active' : ''} ${bottleneck.discipline.colorClass || ''}`}>
              {bottleneck.discipline.title}
            </div>
          )}
        </div>
        <div className="bottleneck-card__footer-right">
          <RankIndicator rank={bottleneck.rank || 0} />
        </div>
      </div>
    </div>
  );
}


