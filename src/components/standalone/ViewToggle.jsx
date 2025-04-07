// src/components/standalone/ViewToggle.jsx - Updated with Graph option
import React, { useState, useEffect } from 'react';
import { updateUserPreference } from '../../lib/userPreferences';

export default function ViewToggle() {
  // Now we have three view types: grid, list, and graph
  const [viewMode, setViewMode] = useState('grid');

  // After component mounts, load the real value
  useEffect(() => {
    const loadViewPreference = () => {
      try {
        // Check global preferences first
        if (typeof window !== 'undefined' && window.userPreferences) {
          const savedViewType = window.userPreferences.viewType;
          if (savedViewType) {
            console.log("Setting view mode from userPreferences:", savedViewType);
            setViewMode(savedViewType);
          }
          else if (window.userPreferences.isListView) {
            setViewMode('list');
          }
          else if (window.userPreferences.isGraphView) {
            setViewMode('graph');
          }
        }
        
        // Check localStorage as backup
        else {
          const savedPrefs = localStorage.getItem('userPreferences');
          if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            const savedViewType = prefs.viewType || 
                                 (prefs.isListView ? 'list' : 
                                 (prefs.isGraphView ? 'graph' : 'grid'));
            
            setViewMode(savedViewType);
          }
        }
      } catch (e) {
        console.error('Error loading view preference:', e);
      }
    };
    
    // Load preference initially
    loadViewPreference();
    
    // Also reload when view-changed events occur
    const handleViewChange = (event) => {
      if (event.detail.viewType) {
        setViewMode(event.detail.viewType);
      }
    };
    
    window.addEventListener('view-changed', handleViewChange);
    
    return () => {
      window.removeEventListener('view-changed', handleViewChange);
    };
  }, []);

  // Toggle the view state - now cycles through three states
  const toggleView = (newViewMode) => {
    console.log("Toggling view to:", newViewMode);
    setViewMode(newViewMode);
    savePreference(newViewMode);
  };

  // Save preference and notify other components
  const savePreference = (newMode) => {
    try {
      // Update localStorage with view type
      updateUserPreference('viewType', newMode);

      // Set specific boolean flags for backward compatibility
      updateUserPreference('isListView', newMode === 'list');
      updateUserPreference('isGraphView', newMode === 'graph');

      // Update global variable for other components
      if (typeof window !== 'undefined') {
        window.userPreferences = window.userPreferences || {};
        window.userPreferences.viewType = newMode;
        window.userPreferences.isListView = newMode === 'list';
        window.userPreferences.isGraphView = newMode === 'graph';
      }

      // Apply view to document
      applyView(newMode);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('view-changed', {
        detail: {
          viewType: newMode,
          isListView: newMode === 'list',
          isGraphView: newMode === 'graph'
        }
      }));
    } catch (e) {
      console.error('Error saving view preference:', e);
    }
  };

  // Apply view to document
  const applyView = (newMode) => {
    // Update data attributes
    document.documentElement.dataset.listView = newMode === 'list' ? 'true' : 'false';
    document.documentElement.dataset.graphView = newMode === 'graph' ? 'true' : 'false';

    // Update grid elements for list view (for backward compatibility)
    const grids = document.querySelectorAll('.bottleneck-grid');
    grids.forEach(grid => {
      if (newMode === 'list') {
        grid.classList.add('bottleneck-grid--list-view');
      } else {
        grid.classList.remove('bottleneck-grid--list-view');
      }

      // Add/remove graph view class
      if (newMode === 'graph') {
        grid.classList.add('bottleneck-grid--graph-view');
      } else {
        grid.classList.remove('bottleneck-grid--graph-view');
      }
    });
  };

  return (
    <div className="view-toggle">
      <button
        className={`view-toggle__button ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => toggleView('list')}
        aria-label="Switch to list view"
        title="List view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
      <button
        className={`view-toggle__button ${viewMode === 'grid' ? 'active' : ''}`}
        onClick={() => toggleView('grid')}
        aria-label="Switch to grid view"
        title="Grid view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
        </svg>
      </button>

      <button
        className={`view-toggle__button graph ${viewMode === 'graph' ? 'active' : ''}`}
        onClick={() => toggleView('graph')}
        aria-label="Switch to graph view"
        title="Network graph view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 96 94" fill="none">
          <path d="M83.222 30.6741C88.8702 30.678 93.8489 26.9574 95.4652 21.5308C97.0812 16.1005 94.9497 10.2533 90.221 7.14989C85.4962 4.04685 79.2977 4.42892 74.9845 8.08776C70.6713 11.7466 69.2708 17.8139 71.537 23.0052L59.2022 30.1493C56.3435 25.9771 51.3916 23.7656 46.3896 24.4255L44.866 18.7173C49.2021 16.1855 50.999 10.8207 49.0675 6.17412C47.136 1.52726 42.0687 -0.966064 37.2251 0.350108C32.3772 1.66233 29.2529 6.37104 29.9109 11.3618C30.5727 16.3561 34.8204 20.0805 39.8375 20.0805C40.0568 20.0805 40.2684 20.0728 40.4838 20.0574L42.0152 25.7811V25.7772C36.0668 28.7954 33.212 35.7268 35.3012 42.0799L22.3153 49.5983H22.3191C18.0445 44.6041 10.6767 43.7049 5.33224 47.5219C-0.0158834 51.339 -1.57796 58.6176 1.73097 64.3028C5.03606 69.9879 12.1195 72.2071 18.0638 69.4205C24.0084 66.6301 26.8555 59.7563 24.624 53.5654L37.4592 46.132C39.5215 48.8028 42.5034 50.6052 45.8238 51.1841V74.4456C41.0105 76.0898 38.1902 81.0879 39.2637 86.0749C40.3371 91.0576 44.9619 94.4463 50.0216 93.9523C55.0811 93.4582 58.971 89.2436 59.0672 84.1451C59.1634 79.0466 55.4389 74.6854 50.4025 73.9979V51.1801C53.5729 50.6282 56.447 48.957 58.4978 46.4715L70.5943 53.4688C68.7359 58.2238 70.7289 63.619 75.2229 66.0199C79.7168 68.4167 85.2883 67.0581 88.1812 62.8551C91.0746 58.6521 90.3667 52.9401 86.5383 49.5748C82.7099 46.2096 76.9771 46.2556 73.2027 49.6829L60.7831 42.4926C61.7373 39.872 61.8605 37.0198 61.1409 34.3297L74.1072 26.819C76.5004 29.2853 79.7899 30.6741 83.222 30.6741ZM48.1138 46.7881C44.5086 46.7881 41.2575 44.6075 39.8762 41.2651C38.4988 37.9266 39.2606 34.0787 41.8114 31.5198C44.3585 28.9648 48.1946 28.2005 51.5227 29.5823C54.8547 30.9678 57.0285 34.2292 57.0285 37.8456C57.0208 42.782 53.0349 46.7804 48.1138 46.7881Z" fill="black" />
        </svg>
      </button>
    </div>
  );
}