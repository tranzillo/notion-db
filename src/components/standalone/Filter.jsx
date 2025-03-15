import React, { useState, useEffect } from 'react';

export default function Filter({ disciplines = [], initialSelectedIds = [] }) {
  const [selected, setSelected] = useState(initialSelectedIds);

  // Process discipline IDs/slugs on first render
  useEffect(() => {
    // Initialize from props or URL
    const processedDisciplines = initialSelectedIds.map(disciplineIdOrSlug => {
      // Check if this is already an ID that matches our disciplines
      if (disciplines.some(d => d.id === disciplineIdOrSlug)) {
        return disciplineIdOrSlug;
      }
      
      // If not, try to find by slug
      const matchingDiscipline = disciplines.find(d => 
        d.title.toLowerCase().replace(/\s+/g, '-') === disciplineIdOrSlug
      );
      
      return matchingDiscipline ? matchingDiscipline.id : null;
    }).filter(Boolean);
    
    setSelected(processedDisciplines);
    
    // Also check URL parameters directly on mount
    const params = new URLSearchParams(window.location.search);
    const urlDisciplines = params.get('disciplines');
    
    if (urlDisciplines) {
      const disciplineSlugs = urlDisciplines.split(',');
      
      // Convert slugs to IDs
      const disciplineIds = disciplineSlugs.map(slug => {
        const match = disciplines.find(d => 
          d.title.toLowerCase().replace(/\s+/g, '-') === slug
        );
        return match ? match.id : null;
      }).filter(Boolean);
      
      if (disciplineIds.length > 0) {
        setSelected(disciplineIds);
      }
    }
  }, []);
  
  // Update URL when selections change
  useEffect(() => {
    // Wait until disciplines are loaded
    if (!disciplines.length) return;
    
    const params = new URLSearchParams(window.location.search);
    
    if (selected.length > 0) {
      // Convert IDs to slugs for URL
      const slugs = selected.map(id => {
        const discipline = disciplines.find(d => d.id === id);
        return discipline 
          ? discipline.title.toLowerCase().replace(/\s+/g, '-') 
          : null;
      }).filter(Boolean);
      
      params.set('disciplines', slugs.join(','));
    } else {
      params.delete('disciplines');
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('disciplines-changed', { 
      detail: { selectedDisciplines: selected } 
    }));
  }, [selected, disciplines]);

  // Handle discipline checkbox change
  const handleDisciplineChange = (disciplineId) => {
    setSelected(prev => {
      if (prev.includes(disciplineId)) {
        return prev.filter(id => id !== disciplineId);
      } else {
        return [...prev, disciplineId];
      }
    });
  };

  // Handle select all disciplines
  const handleSelectAllDisciplines = () => {
    setSelected(disciplines.map(d => d.id));
  };

  // Handle clear all disciplines
  const handleClearAllDisciplines = () => {
    setSelected([]);
  };

  return (
    <div className="discipline-filter">
      <div className="discipline-filter__header">
        <h3>Filter by Discipline</h3>
      </div>
      
      <div className="discipline-filter__actions">
        <button 
          type="button" 
          className="discipline-filter__button" 
          onClick={handleSelectAllDisciplines}
        >
          All
        </button>
        <button 
          type="button" 
          className="discipline-filter__button" 
          onClick={handleClearAllDisciplines}
        >
          None
        </button>
      </div>

      <div className="discipline-filter__list">
        {disciplines.map((discipline) => (
          <div className="discipline-filter__item" key={discipline.id}>
            <div className={`discipline-filter__checkbox ${selected.includes(discipline.id) ? 'active' : ''}`}>
              <input
                type="checkbox"
                id={`discipline-${discipline.id}`}
                name="disciplines"
                value={discipline.id}
                checked={selected.includes(discipline.id)}
                onChange={() => handleDisciplineChange(discipline.id)}
                tabindex="0"
              />
              <label htmlFor={`discipline-${discipline.id}`}>{discipline.title}</label>
            </div>
          </div>
        ))}
      </div>
    
    </div>
  );
}