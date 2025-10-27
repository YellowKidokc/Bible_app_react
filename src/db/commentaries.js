/**
 * Commentary Database Adapter
 *
 * Loads and queries the commentaries.sqlite database using sql.js
 */

import initSqlJs from 'sql.js';

let SQL = null;
let commentaryDB = null;
let loading = null;

/**
 * Initialize and load the commentary database
 */
async function initCommentaryDB() {
  if (commentaryDB) return commentaryDB;
  if (loading) return loading;

  loading = (async () => {
    try {
      console.log('📖 Loading commentary database...');

      // Initialize sql.js
      if (!SQL) {
        SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        });
      }

      // Fetch the commentary database
      const response = await fetch('/commentaries.sqlite');

      if (!response.ok) {
        console.warn('Commentary database not found. Using empty database.');
        // Create empty database
        commentaryDB = new SQL.Database();
        return commentaryDB;
      }

      const buffer = await response.arrayBuffer();
      commentaryDB = new SQL.Database(new Uint8Array(buffer));

      console.log('✅ Commentary database loaded');
      return commentaryDB;

    } catch (error) {
      console.error('Error loading commentary database:', error);
      // Return empty database on error
      if (!SQL) {
        SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        });
      }
      commentaryDB = new SQL.Database();
      return commentaryDB;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

/**
 * Get commentaries for a specific verse
 * @param {string} book - Book name (e.g., "Genesis", "1 Timothy")
 * @param {number} chapter - Chapter number
 * @param {number} verse - Verse number
 * @returns {Promise<Array>} Array of commentary objects
 */
export async function getCommentaries(book, chapter, verse) {
  const db = await initCommentaryDB();

  try {
    const results = db.exec(`
      SELECT id, book, chapter, verse, verse_end, author, source, text
      FROM commentaries
      WHERE book = ? AND chapter = ? AND (verse = ? OR (verse <= ? AND verse_end >= ?))
      ORDER BY id
    `, [book, chapter, verse, verse, verse]);

    if (results.length === 0) return [];

    const columns = results[0].columns;
    const rows = results[0].values;

    return rows.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

  } catch (error) {
    console.error('Error querying commentaries:', error);
    return [];
  }
}

/**
 * Get commentaries for a chapter
 * @param {string} book - Book name
 * @param {number} chapter - Chapter number
 * @returns {Promise<Array>} Array of commentary objects
 */
export async function getChapterCommentaries(book, chapter) {
  const db = await initCommentaryDB();

  try {
    const results = db.exec(`
      SELECT id, book, chapter, verse, verse_end, author, source, text
      FROM commentaries
      WHERE book = ? AND chapter = ?
      ORDER BY verse, id
    `, [book, chapter]);

    if (results.length === 0) return [];

    const columns = results[0].columns;
    const rows = results[0].values;

    return rows.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

  } catch (error) {
    console.error('Error querying chapter commentaries:', error);
    return [];
  }
}

/**
 * Search commentaries by text
 * @param {string} query - Search query
 * @param {number} limit - Max results (default: 50)
 * @returns {Promise<Array>} Array of commentary objects
 */
export async function searchCommentaries(query, limit = 50) {
  const db = await initCommentaryDB();

  try {
    // Try FTS search first
    let results = db.exec(`
      SELECT c.id, c.book, c.chapter, c.verse, c.verse_end, c.author, c.source, c.text
      FROM commentaries_fts fts
      JOIN commentaries c ON c.id = fts.rowid
      WHERE commentaries_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `, [query, limit]);

    if (results.length === 0) {
      // Fallback to LIKE search if FTS not available
      results = db.exec(`
        SELECT id, book, chapter, verse, verse_end, author, source, text
        FROM commentaries
        WHERE text LIKE ?
        LIMIT ?
      `, [`%${query}%`, limit]);
    }

    if (results.length === 0) return [];

    const columns = results[0].columns;
    const rows = results[0].values;

    return rows.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

  } catch (error) {
    console.error('Error searching commentaries:', error);
    return [];
  }
}

/**
 * Get metadata for a book
 * @param {string} book - Book name
 * @returns {Promise<Object|null>} Metadata object or null
 */
export async function getBookMetadata(book) {
  const db = await initCommentaryDB();

  try {
    const results = db.exec(`
      SELECT id, book, source, author, description, metadata
      FROM commentary_metadata
      WHERE book = ?
      LIMIT 1
    `, [book]);

    if (results.length === 0) return null;

    const columns = results[0].columns;
    const row = results[0].values[0];

    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    // Parse metadata JSON if present
    if (obj.metadata) {
      try {
        obj.metadata = JSON.parse(obj.metadata);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return obj;

  } catch (error) {
    console.error('Error getting book metadata:', error);
    return null;
  }
}

/**
 * Get all available commentary authors
 * @returns {Promise<Array<string>>} Array of author names
 */
export async function getCommentaryAuthors() {
  const db = await initCommentaryDB();

  try {
    const results = db.exec(`
      SELECT DISTINCT author
      FROM commentaries
      WHERE author IS NOT NULL
      ORDER BY author
    `);

    if (results.length === 0) return [];

    return results[0].values.map(row => row[0]);

  } catch (error) {
    console.error('Error getting authors:', error);
    return [];
  }
}

/**
 * Get commentary statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getCommentaryStats() {
  const db = await initCommentaryDB();

  try {
    const results = db.exec(`
      SELECT
        COUNT(*) as total_commentaries,
        COUNT(DISTINCT book) as total_books,
        COUNT(DISTINCT author) as total_authors
      FROM commentaries
    `);

    if (results.length === 0) {
      return { total_commentaries: 0, total_books: 0, total_authors: 0 };
    }

    const columns = results[0].columns;
    const row = results[0].values[0];

    const stats = {};
    columns.forEach((col, idx) => {
      stats[col] = row[idx];
    });

    return stats;

  } catch (error) {
    console.error('Error getting stats:', error);
    return { total_commentaries: 0, total_books: 0, total_authors: 0 };
  }
}

export default {
  getCommentaries,
  getChapterCommentaries,
  searchCommentaries,
  getBookMetadata,
  getCommentaryAuthors,
  getCommentaryStats
};
