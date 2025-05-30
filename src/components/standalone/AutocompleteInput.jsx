// src/components/standalone/AutocompleteInput.jsx
import React, { useState, useEffect, useRef } from 'react';

export default function AutocompleteInput({
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
  onFocus = null
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false); // Track focus state
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Update filteredSuggestions when inputValue or suggestions change
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter suggestions that include the input value (case insensitive)
    const filtered = suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, maxSuggestions);
    
    setFilteredSuggestions(filtered);
    
    // Check if there's an exact match with the input value
    const hasExactMatch = filtered.some(
      suggestion => suggestion.toLowerCase() === inputValue.toLowerCase()
    );
    
    // Show suggestions if we have any matches AND there's no exact match AND the input is focused
    setShowSuggestions(filtered.length > 0 && !hasExactMatch && isFocused);
  }, [inputValue, suggestions, maxSuggestions, isFocused]);

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
    
    // Check if we should show filtered suggestions
    if (newValue.trim() === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Filter suggestions that include the input value (case insensitive)
    const filtered = suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(newValue.toLowerCase()))
      .slice(0, maxSuggestions);
    
    setFilteredSuggestions(filtered);
    
    // Check if there's an exact match with the input value
    const hasExactMatch = filtered.some(
      suggestion => suggestion.toLowerCase() === newValue.toLowerCase()
    );
    
    // Show suggestions if we have any matches AND there's no exact match
    setShowSuggestions(filtered.length > 0 && !hasExactMatch && isFocused);
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
    // If no suggestions are showing, do nothing special
    if (!showSuggestions || filteredSuggestions.length === 0) {
      return;
    }

    // Arrow down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev);
    }
    // Arrow up
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : 0);
    }
    // Enter - select the active suggestion
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions[activeSuggestionIndex]) {
        handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
      }
    }
    // Escape - close the suggestions
    else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle focus state
  const handleFocus = () => {
    setIsFocused(true);
    
    // Call parent onFocus if provided
    if (onFocus) {
      onFocus();
    }
    
    // Check if there are suggestions to show
    if (inputValue.trim() !== "") {
      // Check if there's an exact match with the current input
      const hasExactMatch = filteredSuggestions.some(
        suggestion => suggestion.toLowerCase() === inputValue.trim().toLowerCase()
      );
      
      // Only show suggestions if we have matches AND there's no exact match
      if (filteredSuggestions.length > 0 && !hasExactMatch) {
        setShowSuggestions(true);
      }
    }
  };

  // Handle blur state
  const handleBlur = (e) => {
    // Don't immediately blur if clicking on suggestions list
    if (suggestionsRef.current && suggestionsRef.current.contains(e.relatedTarget)) {
      return;
    }
    
    // Wait a bit before hiding suggestions to allow click events to complete
    setTimeout(() => {
      setIsFocused(false);
      
      // Check if there's now an exact match after input blur
      const currentValue = inputValue.trim().toLowerCase();
      const exactMatch = filteredSuggestions.find(
        suggestion => suggestion.toLowerCase() === currentValue
      );
      
      if (exactMatch && exactMatch.toLowerCase() !== inputValue.toLowerCase()) {
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
      
      setShowSuggestions(false);
    }, 100);
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
}