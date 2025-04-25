// src/components/standalone/DownloadButton.jsx
import React from 'react';

export default function DownloadButton() {
  return (
    <a 
      href="/download/gapmap-data.zip" 
      className="download-button" 
      download
      aria-label="Download Gap Map dataset as ZIP file"
      title="Download Gap Map dataset as ZIP file"
    >
      <span>Download Dataset</span>
    </a>
  );
}