// src/components/standalone/EnhancedBackButton.jsx
import { useState, useEffect } from 'react';

export default function EnhancedBackButton({ defaultHref = '/', className = 'back-link' }) {
  const [finalHref, setFinalHref] = useState('#');
  const [useJavaScriptBack, setUseJavaScriptBack] = useState(false);

  useEffect(() => {
    const determineBackDestination = () => {
      try {
        const currentUrl = window.location.href;
        const currentDomain = window.location.origin;
        const referrer = document.referrer;
        
        // Calculate parent path as fallback
        const pathSegments = window.location.pathname.split('/').filter(segment => segment);
        const parentPath = pathSegments.length > 0 
          ? '/' + pathSegments.slice(0, -1).join('/') || '/'
          : defaultHref;

        // Check various conditions where we should use parent path instead of back
        const shouldUseParentPath = 
          // No history
          window.history.length <= 1 ||
          // Referrer is same as current page (loop)
          referrer === currentUrl ||
          // Referrer is empty (direct navigation)
          !referrer ||
          // Referrer is from external domain
          (referrer && !referrer.startsWith(currentDomain));

        if (shouldUseParentPath) {
          setFinalHref(parentPath);
          setUseJavaScriptBack(false);
        } else {
          // Use JavaScript back functionality, but still set href for accessibility
          setFinalHref(parentPath); // Fallback href
          setUseJavaScriptBack(true);
        }
      } catch (error) {
        // Fallback to parent path
        const pathSegments = window.location.pathname.split('/').filter(segment => segment);
        const parentPath = pathSegments.length > 0 
          ? '/' + pathSegments.slice(0, -1).join('/') || '/'
          : defaultHref;
        setFinalHref(parentPath);
        setUseJavaScriptBack(false);
      }
    };

    determineBackDestination();
  }, [defaultHref]);

  const handleClick = (e) => {
    if (useJavaScriptBack) {
      e.preventDefault();
      window.history.back();
    }
    // If not using JavaScript back, let the normal link behavior happen
  };
  
  return (
    <a 
      href={finalHref}
      className={className} 
      onClick={handleClick}
      data-astro-prefetch="false"
    >
      ← Back
    </a>
  );
}