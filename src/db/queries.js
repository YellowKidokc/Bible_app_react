/**
 * Bible database queries - chapter-scoped for fast loading
 */
// Use the fixed adapter that routes database queries appropriately
import { createDB } from './adapter.js';

const dbPromise = createDB();

// Core verse data for a chapter
export const getChapter = async (bookAbbr, chapterNum) => {
  const db = await dbPromise;
  return db.all(`
    SELECT v.id, v.verse_number as n, v.text 
    FROM verses_min v 
    JOIN books b ON b.abbreviation = v.book_abbr 
    WHERE v.book_abbr = ? AND v.chapter_number = ? 
    ORDER BY v.verse_number
  `, [bookAbbr, chapterNum]);
};

// Cross-references for verse IDs
export const getVerseXrefs = async (verseIds) => {
  if (!verseIds.length) return [];
  const db = await dbPromise;
  const placeholders = verseIds.map(() => '?').join(',');
  return db.all(`
    SELECT cr.src_verse_id as src, cr.dst_verse_id as dst,
           b.abbreviation as dst_book, v.chapter_number as dst_chapter, v.verse_number as dst_verse
    FROM cross_references cr
    JOIN verses_min v ON v.id = cr.dst_verse_id
    JOIN books b ON b.abbreviation = v.book_abbr
    WHERE cr.src_verse_id IN (${placeholders})
    ORDER BY b.book_order, v.chapter_number, v.verse_number
  `, verseIds);
};

// Strong's numbers for verse IDs
export const getVerseStrongs = async (verseIds) => {
  if (!verseIds.length) return [];
  const db = await dbPromise;
  const placeholders = verseIds.map(() => '?').join(',');
  return db.all(`
    SELECT verse_id as v, word_position as pos, strong_number as num, 
           original_word as lemma, transliteration, definition
    FROM strong_numbers 
    WHERE verse_id IN (${placeholders})
    ORDER BY verse_id, word_position
  `, verseIds);
};

// Timeline events for verse IDs
export const getVerseTimeline = async (verseIds) => {
  if (!verseIds.length) return [];
  const db = await dbPromise;
  const placeholders = verseIds.map(() => '?').join(',');
  return db.all(`
    SELECT vel.verse_id as v, e.id, e.label, e.type,
           p.name as period, p.start_year_astro, p.end_year_astro
    FROM verse_entity_link vel
    JOIN entities e ON e.id = vel.entity_id AND e.type = 'event'
    LEFT JOIN entity_period_link epl ON epl.entity_id = e.id
    LEFT JOIN periods p ON p.id = epl.period_id
    WHERE vel.verse_id IN (${placeholders})
    ORDER BY COALESCE(p.start_year_astro, 999999), e.label
  `, verseIds);
};

// Commentary/resources for verse IDs
export const getVerseResources = async (verseIds, resourceType = null) => {
  if (!verseIds.length) return [];
  const db = await dbPromise;
  const placeholders = verseIds.map(() => '?').join(',');
  
  let sql = `
    SELECT vrl.verse_id as v, r.id, r.title, r.provider, r.type,
           r.url, r.local_path, r.meta, vrl.label, vrl.relevance
    FROM verse_resource_link vrl
    JOIN resources r ON r.id = vrl.resource_id
    WHERE vrl.verse_id IN (${placeholders})
  `;
  
  const params = [...verseIds];
  if (resourceType) {
    sql += ` AND r.type = ?`;
    params.push(resourceType);
  }
  
  sql += ` ORDER BY r.provider, vrl.relevance DESC, r.title`;
  
  return db.all(sql, params);
};

// Notes for verse IDs
export const getVerseNotes = async (verseIds) => {
  if (!verseIds.length) return [];
  const db = await dbPromise;
  const placeholders = verseIds.map(() => '?').join(',');
  return db.all(`
    SELECT id, subject_id as verse_id, title, body_md, tags, 
           authored_by, created_at, updated_at
    FROM semantic_notes 
    WHERE subject = 'verse' AND subject_id IN (${placeholders})
    ORDER BY created_at DESC
  `, verseIds.map(String));
};

// Search verses (for navigation)
export const searchVerses = async (query, limit = 20) => {
  const db = await dbPromise;
  return db.all(`
    SELECT v.id, v.book_abbr, v.chapter_number, v.verse_number, 
           snippet(verses_min_fts, 3, '<mark>', '</mark>', '...', 32) as snippet
    FROM verses_min_fts v
    WHERE verses_min_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `, [query, limit]);
};

// Get book list for navigation
export const getBooks = async () => {
  const db = await dbPromise;
  return db.all(`
    SELECT id, name, abbreviation, book_order, testament
    FROM books 
    ORDER BY book_order
  `);
};
