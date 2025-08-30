// Weekly Bible Database Sync Worker
// Syncs PostgreSQL data to D1 SQLite for fast edge reads

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Manual trigger endpoint for testing
    if (url.pathname === '/sync' && request.method === 'POST') {
      return await syncDatabase(env);
    }
    
    // Health check
    return new Response('Bible Sync Worker - Ready', { status: 200 });
  },
  
  // Scheduled worker - runs every Sunday at 2 AM UTC
  async scheduled(controller, env, ctx) {
    console.log('Starting weekly database sync...');
    await syncDatabase(env);
  }
};

async function syncDatabase(env) {
  try {
    console.log('Beginning sync from PostgreSQL to D1...');
    
    // Step 1: Get data from PostgreSQL via Hyperdrive
    const postgresData = await fetchPostgresData(env);
    
    // Step 2: Clear and populate D1 database
    await populateD1Database(env, postgresData);
    
    // Step 3: Update sync timestamp
    await updateSyncTimestamp(env);
    
    console.log('Database sync completed successfully');
    return new Response(JSON.stringify({ 
      status: 'success', 
      syncTime: new Date().toISOString(),
      recordsSynced: postgresData.totalRecords
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Database sync failed:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function fetchPostgresData(env) {
  // Connect to PostgreSQL via Hyperdrive
  const hyperdrive = env.HYPERDRIVE;
  
  const queries = {
    books: `
      SELECT id, name, abbreviation, testament, book_order, chapter_count, 
             author, estimated_date_written, genre, theme 
      FROM books 
      ORDER BY book_order
    `,
    verses: `
      SELECT v.id, v.translation_id, v.book_id, v.chapter_id, v.verse_number, 
             v.text, v.word_count, v.contains_blood, v.contains_spirit, v.contains_covenant,
             b.name as book_name, c.chapter_number
      FROM verses v
      JOIN books b ON b.id = v.book_id
      JOIN chapters c ON c.id = v.chapter_id
      ORDER BY b.book_order, c.chapter_number, v.verse_number
    `,
    resources: `
      SELECT id, type, title, url, local_path, file_size, mime_type, meta, created_at
      FROM resources 
      WHERE type = 'audio'
      ORDER BY created_at DESC
    `,
    verse_resource_links: `
      SELECT verse_id, resource_id, label, relevance
      FROM verse_resource_link
    `,
    entities: `
      SELECT id, label, type, description, canonical_ref, meta
      FROM entities
      ORDER BY type, label
    `,
    verse_entity_links: `
      SELECT verse_id, entity_id, role, why, confidence, char_start, char_end
      FROM verse_entity_link
      WHERE confidence > 0.7
    `
  };
  
  const data = {};
  let totalRecords = 0;
  
  // Execute all queries
  for (const [table, query] of Object.entries(queries)) {
    console.log(`Fetching ${table}...`);
    const result = await hyperdrive.prepare(query).all();
    data[table] = result.results;
    totalRecords += result.results.length;
    console.log(`✓ ${table}: ${result.results.length} records`);
  }
  
  data.totalRecords = totalRecords;
  return data;
}

async function populateD1Database(env, data) {
  const db = env.D1_DATABASE;
  
  // Create tables if they don't exist
  await createD1Tables(db);
  
  // Clear existing data (fresh sync each time)
  await clearD1Tables(db);
  
  // Insert books
  console.log('Syncing books...');
  for (const book of data.books) {
    await db.prepare(`
      INSERT INTO books (id, name, abbreviation, testament, book_order, chapter_count, author, estimated_date_written, genre, theme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      book.id, book.name, book.abbreviation, book.testament, book.book_order,
      book.chapter_count, book.author, book.estimated_date_written, book.genre, book.theme
    ).run();
  }
  
  // Insert verses (in batches for performance)
  console.log('Syncing verses...');
  const verseBatches = chunkArray(data.verses, 100);
  for (const batch of verseBatches) {
    const stmt = db.prepare(`
      INSERT INTO verses (id, translation_id, book_id, chapter_id, verse_number, text, word_count, 
                         contains_blood, contains_spirit, contains_covenant, book_name, chapter_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const verse of batch) {
      await stmt.bind(
        verse.id, verse.translation_id, verse.book_id, verse.chapter_id, verse.verse_number,
        verse.text, verse.word_count, verse.contains_blood, verse.contains_spirit, 
        verse.contains_covenant, verse.book_name, verse.chapter_number
      ).run();
    }
  }
  
  // Insert audio resources
  console.log('Syncing audio resources...');
  for (const resource of data.resources) {
    await db.prepare(`
      INSERT INTO resources (id, type, title, url, local_path, file_size, mime_type, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resource.id, resource.type, resource.title, resource.url, resource.local_path,
      resource.file_size, resource.mime_type, JSON.stringify(resource.meta), resource.created_at
    ).run();
  }
  
  // Insert verse-resource links
  console.log('Syncing verse-resource links...');
  for (const link of data.verse_resource_links) {
    await db.prepare(`
      INSERT INTO verse_resource_links (verse_id, resource_id, label, relevance)
      VALUES (?, ?, ?, ?)
    `).bind(link.verse_id, link.resource_id, link.label, link.relevance).run();
  }
  
  // Insert entities
  console.log('Syncing entities...');
  for (const entity of data.entities) {
    await db.prepare(`
      INSERT INTO entities (id, label, type, description, canonical_ref, meta)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      entity.id, entity.label, entity.type, entity.description, 
      entity.canonical_ref, JSON.stringify(entity.meta)
    ).run();
  }
  
  // Insert verse-entity links
  console.log('Syncing verse-entity links...');
  for (const link of data.verse_entity_links) {
    await db.prepare(`
      INSERT INTO verse_entity_links (verse_id, entity_id, role, why, confidence, char_start, char_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      link.verse_id, link.entity_id, link.role, link.why, 
      link.confidence, link.char_start, link.char_end
    ).run();
  }
}

async function createD1Tables(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      testament TEXT,
      book_order INTEGER,
      chapter_count INTEGER,
      author TEXT,
      estimated_date_written TEXT,
      genre TEXT,
      theme TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS verses (
      id INTEGER PRIMARY KEY,
      translation_id INTEGER,
      book_id INTEGER,
      chapter_id INTEGER,
      verse_number INTEGER NOT NULL,
      text TEXT,
      word_count INTEGER,
      contains_blood BOOLEAN DEFAULT 0,
      contains_spirit BOOLEAN DEFAULT 0,
      contains_covenant BOOLEAN DEFAULT 0,
      book_name TEXT,
      chapter_number INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT,
      url TEXT,
      local_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      meta TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS verse_resource_links (
      verse_id INTEGER,
      resource_id TEXT,
      label TEXT,
      relevance REAL,
      PRIMARY KEY (verse_id, resource_id)
    )`,
    `CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      canonical_ref TEXT,
      meta TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS verse_entity_links (
      verse_id INTEGER,
      entity_id TEXT,
      role TEXT,
      why TEXT,
      confidence REAL,
      char_start INTEGER,
      char_end INTEGER,
      PRIMARY KEY (verse_id, entity_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_sync TEXT,
      total_records INTEGER
    )`
  ];
  
  for (const sql of tables) {
    await db.prepare(sql).run();
  }
  
  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_verses_book ON verses(book_id)',
    'CREATE INDEX IF NOT EXISTS idx_verses_chapter ON verses(chapter_id)',
    'CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type)',
    'CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)',
    'CREATE INDEX IF NOT EXISTS idx_verse_resources ON verse_resource_links(verse_id)',
    'CREATE INDEX IF NOT EXISTS idx_verse_entities ON verse_entity_links(verse_id)'
  ];
  
  for (const sql of indexes) {
    await db.prepare(sql).run();
  }
}

async function clearD1Tables(db) {
  const tables = [
    'verse_entity_links', 'verse_resource_links', 'entities', 
    'resources', 'verses', 'books', 'sync_metadata'
  ];
  
  for (const table of tables) {
    await db.prepare(`DELETE FROM ${table}`).run();
  }
}

async function updateSyncTimestamp(env) {
  const db = env.D1_DATABASE;
  await db.prepare(`
    INSERT OR REPLACE INTO sync_metadata (id, last_sync, total_records) 
    VALUES (1, ?, ?)
  `).bind(new Date().toISOString(), 0).run();
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
