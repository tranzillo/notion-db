// src/components/SearchPosts.jsx
import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';

export default function SearchPosts({ initialPosts, onSearchResults, selectedTags = [] }) {
  // Use empty string as initial state for consistent SSR
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState(initialPosts);
  const [fuse, setFuse] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Set hasMounted flag when component has mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Only run this after component has mounted to avoid hydration mismatch
  useEffect(() => {
    if (hasMounted) {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get('q') || '';
      if (queryParam) {
        setSearchQuery(queryParam);
      }
    }
  }, [hasMounted]);

  // Initialize Fuse.js when component mounts or initialPosts changes
  useEffect(() => {
    const fuseOptions = {
      keys: [
        'title',
        'description',
        'tags'
      ],
      includeMatches: true,
      threshold: 0.2
    };

    setFuse(new Fuse(initialPosts, fuseOptions));
  }, [initialPosts]);

  // Perform search when query or fuse changes
  useEffect(() => {
    if (!fuse) return;

    if (searchQuery.trim() === '') {
      setPosts(initialPosts);

      if (onSearchResults) {
        onSearchResults(initialPosts);
      }
    } else {
      const results = fuse.search(searchQuery);
      const searchResults = results.map(result => ({
        ...result.item,
        matches: result.matches
      }));
      setPosts(searchResults);

      if (onSearchResults) {
        onSearchResults(searchResults);
      }
    }
  }, [searchQuery, fuse]);

  // Update URL with search query, but only after mount
  useEffect(() => {
    if (!hasMounted) return;

    const url = new URL(window.location);

    if (searchQuery) {
      url.searchParams.set('q', searchQuery);
    } else {
      url.searchParams.delete('q');
    }

    // Don't remove other params like tags
    window.history.replaceState({}, '', url);
  }, [searchQuery, hasMounted]);

  // Handle search input changes
  const handleSearch = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
  };

  // Clear search and reset
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Format date for display - consistent between server & client
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Use ISO date format which is consistent across environments
      const date = new Date(dateString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  };

  // Helper function to highlight matched text
  const getHighlightedText = (text, matches) => {
    if (!matches || !text) return text;

    // Create a copy we can modify and return as HTML
    let highlightedText = text;
    const matchPositions = [];

    // Collect all match positions for this field
    matches.forEach(match => {
      if (match.indices && match.indices.length) {
        matchPositions.push(...match.indices);
      }
    });

    // No matches found
    if (matchPositions.length === 0) return text;

    // Sort by start position in descending order
    // (so replacements don't affect earlier indices)
    matchPositions.sort((a, b) => b[0] - a[0]);

    // Apply highlights
    matchPositions.forEach(([start, end]) => {
      const before = highlightedText.substring(0, start);
      const match = highlightedText.substring(start, end + 1);
      const after = highlightedText.substring(end + 1);
      highlightedText = before + `<mark>${match}</mark>` + after;
    });

    return highlightedText;
  };

  return (
    <div className="search-container">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-input"
          aria-label="Search posts"
        />
        {searchQuery && (
          <button
            className="clear-search"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="search-results">
        {searchQuery && (
          <p className="search-status">
            {posts.length === 0
              ? 'No posts found'
              : `Found ${posts.length} post${posts.length === 1 ? '' : 's'}`}
          </p>
        )}

        {posts.length === 0 && searchQuery ? (
          <p className="no-results">No posts found. Try a different search term.</p>
        ) : (

          <div className="posts">
            {posts.map(post => (
              <article key={post.id} className="post-card">
                {post.featuredImage && (
                  <div className="post-image">
                    <a href={`/posts/${post.slug}`}>
                      <img src={post.featuredImage} alt={post.title} />
                    </a>
                  </div>
                )}

                <div className="post-content">
                  <h2>
                    <a href={`/posts/${post.slug}`}>
                      {post.matches ? (
                        <span dangerouslySetInnerHTML={{
                          __html: getHighlightedText(
                            post.title,
                            post.matches.filter(m => m.key === 'title')
                          )
                        }} />
                      ) : post.title}
                    </a>
                  </h2>

                  {/* Show description with highlighting */}
                  {post.description && (
                    <div className="post-description">
                      {post.matches ? (
                        <span dangerouslySetInnerHTML={{
                          __html: getHighlightedText(
                            post.description,
                            post.matches.filter(m => m.key === 'description')
                          )
                        }} />
                      ) : post.description}
                    </div>
                  )}

                  <div className="post-meta">
                  {/* {post.publishedDate && (
                      <time dateTime={post.publishedDate}>
                        {formatDate(post.publishedDate)}
                      </time>
                    )} */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="tags">
                        {post.tags.map(tag => (
                          <span
                            key={tag}
                            className={`tag ${selectedTags.includes(tag) ? 'tag-highlight' : ''}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

        )}
      </div>
    </div>
  );
}