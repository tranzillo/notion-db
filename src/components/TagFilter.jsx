// src/components/TagFilter.jsx
import React, { useState, useEffect } from 'react';

export default function TagFilter({ posts, selectedTags, onTagsChange }) {
  const [allTags, setAllTags] = useState([]);
  const [hasMounted, setHasMounted] = useState(false);
  
  // Define all functions before they're used in JSX
  
  // Toggle a tag's selected state
  const toggleTag = (tagName) => {
    const newSelectedTags = selectedTags.includes(tagName)
      ? selectedTags.filter(tag => tag !== tagName)
      : [...selectedTags, tagName];
    
    onTagsChange(newSelectedTags);
  };
  
  // Clear all selected tags
  const clearAllTags = () => {
    onTagsChange([]);
  };
  
  // Select all tags
  const selectAllTags = () => {
    onTagsChange(allTags.map(tag => tag.name));
  };
  
  // Set hasMounted flag when component has mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // Extract all unique tags from posts on component mount
  useEffect(() => {
    if (!posts || !posts.length) return;
    
    // Get all tags from all posts
    const tagsFromPosts = posts
      .filter(post => post.tags && Array.isArray(post.tags))
      .flatMap(post => post.tags);
    
    // Count occurrences of each tag
    const tagCounts = tagsFromPosts.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    
    // Convert to array of objects with name and count, sorted alphabetically
    const uniqueTags = Object.keys(tagCounts)
      .map(tag => ({
        name: tag,
        count: tagCounts[tag]
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    setAllTags(uniqueTags);
  }, [posts]);
  
  return (
    <div className="tag-filter">
      <h2>Filter by Tags</h2>
      
      <div className="tag-actions">
      <button 
          className="tag-action-btn" 
          onClick={selectAllTags}
          aria-label="Select all tags"
        >
          All
        </button>
        <button 
          className="tag-action-btn" 
          onClick={clearAllTags}
          aria-label="Clear all tags"
        >
          None
        </button>
      </div>
      
      <div className="tag-list">
        {allTags.map(tag => (
          <div 
            key={tag.name} 
            className={`tag-item ${selectedTags.includes(tag.name) ? 'tag-item-selected' : ''}`}
          >
            <label className="tag-checkbox">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.name)}
                onChange={() => toggleTag(tag.name)}
              />
              <span className="tag-name">{tag.name}</span>
              <span className="tag-count">({tag.count})</span>
            </label>
          </div>
        ))}
        
        {allTags.length === 0 && (
          <p className="no-tags">No tags found</p>
        )}
      </div>
    </div>
  );
}