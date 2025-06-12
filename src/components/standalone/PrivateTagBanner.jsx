// src/components/standalone/PrivateTagBanner.jsx
import React, { useState, useEffect } from 'react';
import { saveCurrentUrlState } from '../../lib/navigationUtils';
import { updateUrlParamsWithoutHistory } from '../../lib/dataUtils';

export default function PrivateTagBanner() {
  const [privateTag, setPrivateTag] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Check for private tag on mount and listen for URL changes
  useEffect(() => {
    const checkPrivateTag = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const forParam = params.get('for');
        
        if (forParam) {
          setPrivateTag(forParam);
          setIsVisible(true);
          
          // Ensure other components know about the private tag
          window.dispatchEvent(new CustomEvent('private-tag-changed', { 
            detail: { privateTag: forParam } 
          }));
        } else {
          setIsVisible(false);
        }
      }
    };
    
    // Check on initial load
    checkPrivateTag();
    
    // Also check when URL changes (to handle browser back/forward navigation)
    const handleUrlChange = () => {
      checkPrivateTag();
    };
    
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Clear the private tag filter
  const handleClear = () => {
    setIsVisible(false);
    setPrivateTag('');
    
    // Remove the 'for' parameter from URL without creating history entry
    updateUrlParamsWithoutHistory({ for: null });
    
    // Notify other components that the private tag has been cleared
    window.dispatchEvent(new CustomEvent('private-tag-changed', { 
      detail: { privateTag: '' } 
    }));
    
    // Save the URL state
    saveCurrentUrlState(true);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="private-tag-banner">
      <div className="private-tag-banner__content">
        <span>👋 Hello! This view is customized for <strong>{privateTag}</strong>.</span>
        <button 
          onClick={handleClear}
          className="private-tag-banner__clear"
          aria-label="Clear customized view"
          title="Clear customized view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  );
}