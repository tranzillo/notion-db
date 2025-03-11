// src/components/BlogLayout.jsx
import React, { useState, useEffect } from 'react';
import SearchPosts from './SearchPosts.jsx';
import TagFilter from './TagFilter.jsx';

export default function BlogLayout({ initialPosts }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState(initialPosts);
  const [hasMounted, setHasMounted] = useState(false);

  // Set hasMounted flag when component has mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Get initial tag selection from URL - only run after component mounts
  useEffect(() => {
    if (hasMounted) {
      const params = new URLSearchParams(window.location.search);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        setSelectedTags(tagsParam.split(','));
      }
    }
  }, [hasMounted]);

  // Update URL when tag selection changes (only after mounting)
  useEffect(() => {
    if (!hasMounted) return;

    const url = new URL(window.location);

    if (selectedTags.length > 0) {
      url.searchParams.set('tags', selectedTags.join(','));
    } else {
      url.searchParams.delete('tags');
    }

    // Preserve search query parameter if it exists
    const searchQuery = url.searchParams.get('q');
    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    }

    window.history.replaceState({}, '', url);
  }, [selectedTags, hasMounted]);

  // Filter posts by selected tags
  useEffect(() => {
    if (selectedTags.length === 0) {
      // If no tags selected, show all posts
      setFilteredPosts(initialPosts);
    } else {
      // Filter posts that have at least one of the selected tags
      const postsWithSelectedTags = initialPosts.filter(post => {
        if (!post.tags || !Array.isArray(post.tags)) return false;
        return post.tags.some(tag => selectedTags.includes(tag));
      });

      setFilteredPosts(postsWithSelectedTags);
    }
  }, [selectedTags, initialPosts]);

  // Handle tag selection changes
  const handleTagsChange = (newSelectedTags) => {
    setSelectedTags(newSelectedTags);
  };

  // Handle search results
  const handleSearchResults = (results) => {
    // We don't need to update state here since the SearchPosts component
    // already has its own state for the filtered results
  }; return (
    <div className="blog-layout">
      <div className="blog-sidebar">
        <TagFilter
          posts={initialPosts}
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
        />
      </div>

      <div className="blog-main">
        <SearchPosts
          initialPosts={filteredPosts}
          onSearchResults={handleSearchResults}
          selectedTags={selectedTags}
        />

        {/* Show status message for tag filtering */}
        {selectedTags.length > 0 && (
          <div className="filter-status">
              Filtering by tags:
              {selectedTags.map((tag, index) => (
                <span key={tag} className="selected-tag">
                  {tag}
                  <button
                    className="remove-tag"
                    onClick={() => {
                      const newTags = selectedTags.filter(t => t !== tag);
                      handleTagsChange(newTags);
                    }}
                    aria-label={`Remove ${tag} filter`}
                  >
                    ×
                  </button>
                  {index < selectedTags.length - 1 ? ', ' : ''}
                </span>
              ))}
              <button
                className="clear-filters"
                onClick={() => handleTagsChange([])}
                aria-label="Clear all filters"
              >
                (Clear)
              </button>
          </div>
        )}
      </div>
    </div>
  );
}