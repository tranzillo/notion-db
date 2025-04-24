// src/components/standalone/DownloadButton.jsx
import React from 'react';

export default function DownloadButton() {
  return (
    <a 
      href="/download/gapmap-data.zip" 
      className="download-button" 
      download
      aria-label="Download R&D Gaps dataset"
      title="Download R&D Gaps dataset as ZIP file"
    >
      <span>Download Dataset</span>
    </a>
  );
}