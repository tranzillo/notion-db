// src/components/standalone/FieldFilter.jsx
import React, { useState, useEffect } from 'react';
import { saveCurrentUrlState } from '../../lib/navigationUtils';
import { createFieldSlug } from '../../lib/slugUtils';
import { sharedFieldStore, updateSelectedFields, loadSelectedFields } from '../../lib/sharedStore';
import { updateUrlParamsWithoutHistory } from '../../lib/dataUtils';

export default function FieldFilter({
  fields = [],
  initialSelectedIds = [],
  fieldCounts = {}
}) {
  const [selected, setSelected] = useState(initialSelectedIds);

  // Process field IDs/slugs on first render
  useEffect(() => {
    // First try to load from shared store/session storage
    const sharedFields = loadSelectedFields();
    
    if (sharedFields && sharedFields.length > 0) {
      // Use shared fields if available
      setSelected(sharedFields);
    } else if (initialSelectedIds.length > 0) {
      // Otherwise use initialSelectedIds
      const processedFields = initialSelectedIds.map(fieldIdOrSlug => {
        // Check if this is already an ID that matches our fields
        if (fields.some(d => d.id === fieldIdOrSlug)) {
          return fieldIdOrSlug;
        }

        // If not, try to find by slug
        const matchingField = fields.find(d =>
          createFieldSlug(d.field_name) === fieldIdOrSlug
        );

        return matchingField ? matchingField.id : null;
      }).filter(Boolean);

      setSelected(processedFields);
      
      // Also update the shared store
      updateSelectedFields(processedFields);
    } else {
      // Check URL parameters directly on mount
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlFields = params.get('fields');

        if (urlFields) {
          const fieldSlugs = urlFields.split(',');

          // Convert slugs to IDs
          const fieldIds = fieldSlugs.map(slug => {
            const match = fields.find(d =>
              createFieldSlug(d.field_name) === slug
            );
            return match ? match.id : null;
          }).filter(Boolean);

          if (fieldIds.length > 0) {
            setSelected(fieldIds);
            // Update shared store
            updateSelectedFields(fieldIds);
          }
        }
      }
    }
  }, [fields.length]);

  // Update URL when selections change
  useEffect(() => {
    // Wait until fields are loaded
    if (!fields.length) return;
  
    if (selected.length > 0) {
      // Convert IDs to slugs for URL
      const slugs = selected.map(id => {
        const field = fields.find(d => d.id === id);
        return field ? createFieldSlug(field.field_name) : null;
      }).filter(Boolean);
  
      updateUrlParamsWithoutHistory({ fields: slugs.join(',') });
    } else {
      updateUrlParamsWithoutHistory({ fields: null });
    }
  
    // Notify other components
    window.dispatchEvent(new CustomEvent('fields-changed', {
      detail: { selectedFields: selected }
    }));
  }, [selected, fields]);

  // Handle field checkbox change
  const handleFieldChange = (fieldId) => {
    setSelected(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  // Handle select all fields
  const handleSelectAllFields = () => {
    setSelected(fields.map(d => d.id));
  };

  // Handle clear all fields
  const handleClearAllFields = () => {
    setSelected([]);

    // Force save empty state when clearing all fields
    saveCurrentUrlState(true);
  };

  return (
    <div className="field-filter">
      <div className="field-filter__header">
        <h3>Filter by Field</h3>
      </div>

      <div className="field-filter__actions">
        <button
          type="button"
          className="field-filter__button"
          onClick={handleSelectAllFields}
        >
          All
        </button>
        <button
          type="button"
          className="field-filter__button"
          onClick={handleClearAllFields}
        >
          None
        </button>
      </div>

      <div className="field-filter__list">
        {fields.map((field) => (
          <div className="field-filter__item" key={field.id}>
            <div className={`field-filter__checkbox ${selected.includes(field.id) ? 'active' : ''} ${field.colorClass || ''}`}>
              <input
                type="checkbox"
                id={`field-${field.id}`}
                name="fields"
                value={field.id}
                checked={selected.includes(field.id)}
                onChange={() => handleFieldChange(field.id)}
                tabIndex="0"
              />
              <label htmlFor={`field-${field.id}`}>
                {field.field_name}
                <span className="field-count">
                  {fieldCounts[field.id] ? ` (${fieldCounts[field.id]})` : ''}
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}