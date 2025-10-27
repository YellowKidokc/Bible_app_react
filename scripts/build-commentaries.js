#!/usr/bin/env node

/**
 * Build Script: Convert TOML Commentary Files to SQLite Database
 *
 * This script:
 * 1. Scans the commentaries/ folder for TOML files
 * 2. Parses each TOML file
 * 3. Creates a SQLite database (commentaries.sqlite)
 * 4. Saves it to public/ folder for bundling with the app
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import toml from '@iarna/toml';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMENTARIES_DIR = path.join(__dirname, '../commentaries');
const OUTPUT_DB = path.join(__dirname, '../public/commentaries.sqlite');

console.log('🔨 Building Commentary Database...\n');

// Check if commentaries folder exists
if (!fs.existsSync(COMMENTARIES_DIR)) {
  console.log('📁 Commentaries folder not found. Creating placeholder database...');
  console.log(`   Expected location: ${COMMENTARIES_DIR}`);
  console.log('   Place your commentary TOML files there and run this script again.\n');

  // Create empty database with schema
  createEmptyDatabase();
  process.exit(0);
}

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create or open database
const db = new Database(OUTPUT_DB);

// Create schema
console.log('📊 Creating database schema...');
db.exec(`
  DROP TABLE IF EXISTS commentaries;
  DROP TABLE IF EXISTS commentary_metadata;

  CREATE TABLE commentaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book TEXT NOT NULL,
    chapter INTEGER,
    verse INTEGER,
    verse_end INTEGER,
    author TEXT,
    source TEXT,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE commentary_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book TEXT NOT NULL,
    source TEXT,
    author TEXT,
    description TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_commentaries_book_chapter_verse ON commentaries(book, chapter, verse);
  CREATE INDEX idx_commentaries_book ON commentaries(book);
  CREATE INDEX idx_commentaries_author ON commentaries(author);
  CREATE INDEX idx_metadata_book ON commentary_metadata(book);
`);

console.log('✅ Schema created\n');

// Prepare insert statements
const insertCommentary = db.prepare(`
  INSERT INTO commentaries (book, chapter, verse, verse_end, author, source, text)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMetadata = db.prepare(`
  INSERT INTO commentary_metadata (book, source, author, description, metadata)
  VALUES (?, ?, ?, ?, ?)
`);

// Scan commentaries directory
console.log('📖 Scanning commentary files...\n');

let totalCommentaries = 0;
let totalBooks = 0;

const bookDirs = fs.readdirSync(COMMENTARIES_DIR).filter(file => {
  const filePath = path.join(COMMENTARIES_DIR, file);
  return fs.statSync(filePath).isDirectory();
});

for (const bookDir of bookDirs) {
  const bookPath = path.join(COMMENTARIES_DIR, bookDir);
  const bookName = bookDir;

  console.log(`📚 Processing: ${bookName}`);

  const files = fs.readdirSync(bookPath).filter(f => f.endsWith('.toml'));

  for (const file of files) {
    const filePath = path.join(bookPath, file);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = toml.parse(content);

      // Check if this is metadata file
      if (file === 'metadata.toml') {
        insertMetadata.run(
          bookName,
          data.source || null,
          data.author || null,
          data.description || null,
          JSON.stringify(data)
        );
        continue;
      }

      // Parse verse reference from filename
      // Example: "Deuteronomy 25_4.toml" -> chapter: 25, verse: 4
      const match = file.match(/(\d+)_(\d+)(?:-(\d+))?\.toml$/);

      let chapter = null;
      let verse = null;
      let verseEnd = null;

      if (match) {
        chapter = parseInt(match[1], 10);
        verse = parseInt(match[2], 10);
        verseEnd = match[3] ? parseInt(match[3], 10) : null;
      }

      // Extract commentary data
      const author = data.author || data.source || 'Unknown';
      const source = data.source || bookName;
      const text = data.text || data.commentary || data.content || '';

      if (text) {
        insertCommentary.run(
          bookName,
          chapter,
          verse,
          verseEnd,
          author,
          source,
          text
        );
        totalCommentaries++;
      }

    } catch (error) {
      console.error(`   ⚠️  Error parsing ${file}:`, error.message);
    }
  }

  totalBooks++;
  console.log(`   ✅ ${files.length} files processed`);
}

console.log('\n📊 Summary:');
console.log(`   Books: ${totalBooks}`);
console.log(`   Commentaries: ${totalCommentaries}`);

// Create full-text search index
console.log('\n🔍 Creating full-text search index...');
try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS commentaries_fts USING fts5(
      book, chapter, verse, author, text,
      content='commentaries',
      content_rowid='id'
    );

    INSERT INTO commentaries_fts(commentaries_fts, rowid, book, chapter, verse, author, text)
    SELECT 'insert', id, book, chapter, verse, author, text FROM commentaries;
  `);
  console.log('✅ Full-text search enabled');
} catch (error) {
  console.log('⚠️  FTS not available (optional feature)');
}

db.close();

console.log(`\n✅ Database created: ${OUTPUT_DB}`);
console.log('📦 Ready to bundle with your app!\n');

function createEmptyDatabase() {
  const db = new Database(OUTPUT_DB);
  db.exec(`
    CREATE TABLE commentaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book TEXT NOT NULL,
      chapter INTEGER,
      verse INTEGER,
      verse_end INTEGER,
      author TEXT,
      source TEXT,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE commentary_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book TEXT NOT NULL,
      source TEXT,
      author TEXT,
      description TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.close();
  console.log(`✅ Empty database created: ${OUTPUT_DB}\n`);
}
