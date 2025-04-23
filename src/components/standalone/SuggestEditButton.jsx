// src/components/standalone/SuggestEditButton.jsx
import React from 'react';

export default function SuggestEditButton({ 
  contentType, 
  contentId, 
  contentTitle,
  contentDescription,
  contentField,
  relatedGaps = []
}) {
  // Function to prepare and encode the data to pass via URL
  const handleClick = () => {
    // Create a data object with all necessary information
    const data = {
      contentType,
      contentId,
      contentTitle,
      contentDescription: contentDescription?.substring(0, 500), // Limit length to avoid URL issues
      contentField,
      relatedGaps
    };
    
    // Encode the data as a URL-safe string
    const encodedData = encodeURIComponent(JSON.stringify(data));
    
    // Navigate to the contribute page with the data
    window.location.href = `/contribute?edit=${encodedData}`;
  };

  return (
    <button 
      className="suggest-edit-button" 
      onClick={handleClick}
      aria-label="Suggest an edit for this content"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
      <span>Suggest an Edit</span>
    </button>
  );
}