// src/components/standalone/EnhancedBackButton.jsx
import React, { useState, useEffect } from 'react';

export default function EnhancedBackButton({ defaultHref = '/', className = 'back-link' }) {
  const handleClick = (e) => {
    e.preventDefault();
    
    // Simply use browser's back functionality if possible
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to simple navigation if we can't go back
      window.location.href = defaultHref;
    }
  };
  
  return (
    <a 
      href="#"
      className={className} 
      onClick={handleClick}
      data-astro-prefetch="false"
    >
      ← Back
    </a>
  );
}