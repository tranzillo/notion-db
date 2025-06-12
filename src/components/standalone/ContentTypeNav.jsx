// src/components/standalone/ContentTypeNav.jsx
import React, { useState, useEffect } from 'react';

export default function ContentTypeNav() {
  // We'll determine the current path directly in the render function
  // This ensures we always have the latest path without state lag
  
  // Helper function to check if a path is active
  const isPathActive = (basePath) => {
    if (typeof window === 'undefined') return false;
    
    const currentPath = window.location.pathname;
    
    if (basePath === '/') {
      // For home or gaps, consider these the same section
      return currentPath === '/' || 
             currentPath === '/gaps' || 
             currentPath.startsWith('/gaps/');
    }
    
    // For other paths, check if the current path starts with the base path
    return currentPath === basePath || currentPath.startsWith(`${basePath}/`);
  };
  
  // Force render updates when the component mounts and after navigation
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Handler to force a re-render when the path changes
    const handlePathChange = () => {
      forceUpdate({});
    };
    
    // Listen for all possible navigation events
    document.addEventListener('astro:page-load', handlePathChange);
    document.addEventListener('astro:after-swap', handlePathChange);
    window.addEventListener('popstate', handlePathChange);
    
    // Clean up
    return () => {
      document.removeEventListener('astro:page-load', handlePathChange);
      document.removeEventListener('astro:after-swap', handlePathChange);
      window.removeEventListener('popstate', handlePathChange);
    };
  }, []);
  
  return (
    <div className="content-type-nav">
      <a 
        href="/" 
        className={`content-type-nav__link ${isPathActive('/') ? 'active' : ''}`}
      >
        R&D Gaps
      </a>
      <a 
        href="/capabilities" 
        className={`content-type-nav__link ${isPathActive('/capabilities') ? 'active' : ''}`}
      >
        Capabilities
      </a>
      <a 
        href="/resources" 
        className={`content-type-nav__link ${isPathActive('/resources') ? 'active' : ''}`}
      >
        Resources
      </a>
    </div>
  );
}