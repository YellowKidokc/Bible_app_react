/**
 * Commentary Panel Component
 *
 * Displays Bible commentaries for the current verse/chapter
 */

import { useState, useEffect } from 'react';
import {
  getCommentaries,
  getChapterCommentaries,
  searchCommentaries,
  getCommentaryAuthors
} from '../db/commentaries';

export default function CommentaryPanel({ book, chapter, verse, mode = 'verse' }) {
  const [commentaries, setCommentaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState('all');
  const [authors, setAuthors] = useState([]);

  // Load available authors
  useEffect(() => {
    getCommentaryAuthors().then(setAuthors);
  }, []);

  // Load commentaries when verse/chapter changes
  useEffect(() => {
    if (!book || !chapter) return;

    setLoading(true);
    setError(null);

    const loadCommentaries = async () => {
      try {
        let data;
        if (mode === 'chapter' || !verse) {
          data = await getChapterCommentaries(book, chapter);
        } else {
          data = await getCommentaries(book, chapter, verse);
        }
        setCommentaries(data);
      } catch (err) {
        setError('Failed to load commentaries');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCommentaries();
  }, [book, chapter, verse, mode]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchCommentaries(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Filter commentaries by selected author
  const filteredCommentaries = selectedAuthor === 'all'
    ? commentaries
    : commentaries.filter(c => c.author === selectedAuthor);

  const displayCommentaries = searchResults.length > 0 ? searchResults : filteredCommentaries;

  return (
    <div className="commentary-panel">
      <div className="commentary-header">
        <h3>📖 Commentaries</h3>

        {/* Search Bar */}
        <div className="commentary-search">
          <input
            type="text"
            placeholder="Search commentaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={searching}>
            {searching ? '...' : '🔍'}
          </button>
        </div>

        {/* Author Filter */}
        {authors.length > 0 && (
          <div className="commentary-filter">
            <label>Filter by author:</label>
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
            >
              <option value="all">All Authors</option>
              {authors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="commentary-content">
        {loading ? (
          <div className="commentary-loading">Loading commentaries...</div>
        ) : error ? (
          <div className="commentary-error">{error}</div>
        ) : displayCommentaries.length === 0 ? (
          <div className="commentary-empty">
            {searchQuery ? (
              <>No commentaries found for "{searchQuery}"</>
            ) : (
              <>No commentaries available for this {mode === 'chapter' ? 'chapter' : 'verse'}</>
            )}
          </div>
        ) : (
          <div className="commentary-list">
            {displayCommentaries.map((commentary) => (
              <div key={commentary.id} className="commentary-item">
                <div className="commentary-meta">
                  <span className="commentary-author">{commentary.author}</span>
                  {commentary.source && (
                    <span className="commentary-source"> • {commentary.source}</span>
                  )}
                  <span className="commentary-ref">
                    {' '}• {commentary.book} {commentary.chapter}:
                    {commentary.verse_end
                      ? `${commentary.verse}-${commentary.verse_end}`
                      : commentary.verse}
                  </span>
                </div>
                <div className="commentary-text">
                  {commentary.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
