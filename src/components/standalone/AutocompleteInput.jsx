// src/components/standalone/AutocompleteInput.jsx
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const AutocompleteInput = forwardRef(({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  suggestions = [],
  maxSuggestions = 50,
  onSuggestionSelect = null,
  className = '',
  style = {},
  onFocus = null,
  onKeyDown = null
}, ref) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false); // Track focus state
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
        // The focus handler and useEffect will take care of showing suggestions
        // This prevents duplicate logic and race conditions
      }
    }
  }));

  // Update filteredSuggestions when inputValue or suggestions change
  useEffect(() => {
    if (inputValue.trim() === '') {
      // For empty input, just set filtered suggestions but don't show/hide them
      // The focus effect will handle visibility
      const allSuggestions = suggestions.slice(0, maxSuggestions);
      setFilteredSuggestions(allSuggestions);
      return;
    }

    // Filter suggestions that include the input value (case insensitive)
    const filtered = suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, maxSuggestions);
    
    setFilteredSuggestions(filtered);
    
    // For non-empty input, only update visibility if focused
    if (isFocused) {
      const hasExactMatch = filtered.some(
        suggestion => suggestion.toLowerCase() === inputValue.toLowerCase()
      );
      setShowSuggestions(filtered.length > 0 && !hasExactMatch);
    }
  }, [inputValue, suggestions, maxSuggestions, isFocused]);

  // Handle focus state changes - show/hide suggestions based on focus
  useEffect(() => {
    if (isFocused) {
      // When focused, show suggestions if we have them and they're appropriate
      if (inputValue.trim() === '') {
        setShowSuggestions(filteredSuggestions.length > 0);
      } else {
        const hasExactMatch = filteredSuggestions.some(
          suggestion => suggestion.toLowerCase() === inputValue.toLowerCase()
        );
        setShowSuggestions(filteredSuggestions.length > 0 && !hasExactMatch);
      }
    } else {
      // When not focused, hide suggestions
      setShowSuggestions(false);
    }
  }, [isFocused, filteredSuggestions, inputValue]);

  // Update local state when value prop changes
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(value);
    }
  }, [value]);

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call the parent onChange handler
    if (onChange) {
      onChange(e);
    }
    
    // The useEffect for inputValue will handle updating suggestions
    // This prevents duplicate logic and race conditions
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    
    // Call the parent onSuggestionSelect handler if provided
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
    
    // Create a synthetic event to pass to parent onChange
    if (onChange) {
      const syntheticEvent = {
        target: { value: suggestion }
      };
      onChange(syntheticEvent);
    }
    
    // Focus back on the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    // If suggestions are showing, handle navigation
    if (showSuggestions && filteredSuggestions.length > 0) {
      // Arrow down
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev);
        return;
      }
      // Arrow up
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : 0);
        return;
      }
      // Enter - check for exact match, otherwise treat as add button
      else if (e.key === 'Enter') {
        e.preventDefault();
        
        // Check if current input exactly matches any suggestion
        const exactMatch = filteredSuggestions.find(
          suggestion => suggestion.toLowerCase() === inputValue.toLowerCase()
        );
        
        if (exactMatch) {
          // If exact match exists, select it
          handleSuggestionClick(exactMatch);
        } else {
          // No exact match - treat as add button click
          if (onKeyDown) {
            onKeyDown(e);
          }
        }
        return;
      }
      // Escape - close the suggestions
      else if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    
    // If no suggestions are showing and Enter is pressed, call custom handler
    if (e.key === 'Enter' && (!showSuggestions || filteredSuggestions.length === 0)) {
      if (onKeyDown) {
        onKeyDown(e);
      }
    }
  };

  // Handle focus state
  const handleFocus = () => {
    setIsFocused(true);
    
    // Call parent onFocus if provided
    if (onFocus) {
      onFocus();
    }
    
    // The actual suggestion display logic is handled by the useEffect for isFocused
    // This keeps the logic centralized and prevents race conditions
  };

  // Handle blur state
  const handleBlur = (e) => {
    // Don't immediately blur if clicking on suggestions list or add button
    if (suggestionsRef.current && suggestionsRef.current.contains(e.relatedTarget)) {
      return;
    }
    
    // Don't blur if clicking on an add button (to prevent interference with add button clicks)
    if (e.relatedTarget && e.relatedTarget.classList && e.relatedTarget.classList.contains('add-button')) {
      return;
    }
    
    // Wait a bit before hiding suggestions to allow click events to complete
    setTimeout(() => {
      setIsFocused(false);
      
      // Only auto-correct if the input has content and we're not showing suggestions
      if (inputValue.trim() && !showSuggestions) {
        const currentValue = inputValue.trim().toLowerCase();
        const exactMatch = suggestions.find(
          suggestion => suggestion.toLowerCase() === currentValue
        );
        
        if (exactMatch && exactMatch !== inputValue) {
          // Update with the properly cased version of the match
          setInputValue(exactMatch);
          if (onChange) {
            // Create a synthetic event to pass to parent onChange
            const syntheticEvent = {
              target: { value: exactMatch }
            };
            onChange(syntheticEvent);
          }
        }
      }
      
      setShowSuggestions(false);
    }, 150); // Increased timeout to ensure add button clicks complete
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className={`autocomplete-input ${className}`}>
      {label && (
        <label htmlFor={id}>{label} {required && '*'}</label>
      )}
      
      <div className="autocomplete-input__container">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={style}
        />
        
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul 
            className="autocomplete-input__suggestions"
            ref={suggestionsRef}
          >
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={index}
                className={`autocomplete-input__suggestion ${index === activeSuggestionIndex ? 'active' : ''}`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

AutocompleteInput.displayName = 'AutocompleteInput';

export default AutocompleteInput;