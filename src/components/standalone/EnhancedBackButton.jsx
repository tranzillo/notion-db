// src/components/standalone/EnhancedBackButton.jsx
import React, { useEffect, useState } from 'react';
import { getSavedUrlState } from '../../lib/navigationUtils';
import { getSavedScrollPosition } from '../../lib/scrollPositionUtils';

export default function EnhancedBackButton({ defaultHref = '/', className = 'back-link' }) {
  const [targetHref, setTargetHref] = useState(defaultHref);
  
  useEffect(() => {
    // Get saved dashboard state, if any
    const savedState = getSavedUrlState();
    if (savedState) {
      setTargetHref(`/${savedState}`);
    }
  }, []);
  
  const handleClick = (e) => {
    e.preventDefault();
    const savedState = getSavedUrlState();
    
    // Check if we have scroll position saved too
    const scrollData = getSavedScrollPosition();
    
    // If we have a saved dashboard state with filters
    if (savedState) {
      // For scroll restoration to work properly, we need to use full page navigation
      // rather than Astro's view transitions here
      window.location.href = `/${savedState}`;
    }
    // If we're in a navigation stack, go back
    else if (window.history.length > 1) {
      window.history.back();
    } 
    // Fallback to simple navigation
    else {
      window.location.href = defaultHref;
    }
  };
  
  return (
    <a 
      href={targetHref} 
      className={className} 
      onClick={handleClick}
      // Disable Astro's prefetching for this link to ensure we get a full page load
      // which is needed for our scroll restoration to work properly
      data-astro-prefetch="false"
    >
      ← Back
    </a>
  );
}