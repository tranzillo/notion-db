// src/components/standalone/SolutionCard.jsx
import React from 'react';
import { saveScrollPosition } from '../../lib/scrollPositionUtils';

export default function SolutionCard({
  solution,
  searchQuery = '',
  selectedDisciplines = [],
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

  // Get all unique disciplines from associated bottlenecks
  const getAllDisciplines = () => {
    if (!solution.bottlenecks || !Array.isArray(solution.bottlenecks)) return [];
    
    const disciplineMap = new Map();
    solution.bottlenecks.forEach(bottleneck => {
      if (bottleneck.discipline && bottleneck.discipline.id) {
        disciplineMap.set(bottleneck.discipline.id, bottleneck.discipline);
      }
    });
    
    return Array.from(disciplineMap.values());
  };

  // Get all disciplines
  const allDisciplines = getAllDisciplines();
  
  // Check if any discipline is selected
  const hasDisciplineSelected = allDisciplines.some(discipline => 
    selectedDisciplines.includes(discipline.id)
  );

  // Prepare content
  const solutionUrl = `/solutions/${solution.slug}`;
  const truncatedContent = truncateText(solution.content, truncateLength);
  const displayTitle = searchQuery ? highlightMatches(solution.title, searchQuery) : solution.title;
  const displayContent = searchQuery ? highlightMatches(truncatedContent, searchQuery) : truncatedContent;

  // Handle click to save position
  const handleCardClick = () => {
    saveScrollPosition(solution.id, solution.slug);
  };

  return (
    <div className="solution-card solution-card--grid" id={`solution-card-${solution.id}`}>
      <a
        href={solutionUrl}
        className="solution-card__clickable"
        onClick={handleCardClick}
        aria-labelledby={`card-title-${solution.id}`}
      />
      <div className="solution-card__header">
        <h2 className="solution-card__title">
          <a
            href={solutionUrl}
            dangerouslySetInnerHTML={{ __html: displayTitle }}
            onClick={handleCardClick}
          />
        </h2>
      </div>

      <div className="solution-card__content">
        <div dangerouslySetInnerHTML={{ __html: displayContent }} />
      </div>

      <div className="solution-card__footer">
        <div className="solution-card__footer-left">
          {allDisciplines.length > 0 && (
            <div className="solution-card__disciplines">
              {allDisciplines.map(discipline => (
                <div 
                  key={discipline.id}
                  className={`solution-card__discipline ${selectedDisciplines.includes(discipline.id) ? 'active' : ''} ${discipline.colorClass || ''}`}
                >
                  {discipline.title}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="solution-card__footer-right">
          <div className="solution-card__bottlenecks-count">
            {solution.bottlenecks?.length || 0} Bottlenecks
          </div>
        </div>
      </div>
    </div>
  );
}