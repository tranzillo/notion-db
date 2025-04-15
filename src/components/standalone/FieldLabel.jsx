// src/components/standalone/FieldLabel.jsx
import React from 'react';
import { createFieldSlug } from '../../lib/slugUtils';

export default function FieldLabel({
  field,
  isSelected = false,
  onClick = null,
  className = ''
}) {
  // If no field is provided, don't render anything
  if (!field) return null;

  // Generate the field URL
  const fieldUrl = `/fields/${field.slug || createFieldSlug(field.field_name)}`;
  
  // Use the colorClass that's already assigned to the field object
  // This comes from the enhancedData process which uses your fieldColors.js system
  const colorClass = field.colorClass || '';

  // Prepare the className with active state and any custom classes
  const fieldClassName = `field-label ${isSelected ? 'active' : ''} ${colorClass} ${className}`;

  // If an onClick handler is provided, render a button (for filters)
  if (onClick) {
    return (
      <button
        className={fieldClassName}
        onClick={() => onClick(field.id)}
        aria-pressed={isSelected}
      >
        {field.field_name}
      </button>
    );
  }

  // Otherwise, render an anchor tag for navigation to field page
  return (
    <a
      href={fieldUrl}
      className={fieldClassName}
    >
      {field.field_name}
    </a>
  );
}