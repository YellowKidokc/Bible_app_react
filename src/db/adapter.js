/**
 * Database adapter that works across Web, Mobile, and Desktop
 * - Web: Uses our new API layer (reads from D1 cache)
 * - Mobile: Capacitor SQLite plugin
 * - Desktop: Tauri SQLite plugin
 */

let dbPromise = null;

export async function createDB() {
  if (dbPromise) return dbPromise;

  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  const isCap = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
  const isWeb = !isTauri && !isCap;

  if (isWeb) {
    // Web: Use API layer (reads from D1 cache)
    dbPromise = (async () => {
      // Import our API layer instead of direct database access
      const api = (await import('../api.js')).default;
      
      return {
        async all(sql, params = []) {
          // Route SQL queries to appropriate API endpoints
          return routeSQLToAPI(sql, params, api);
        },
        
        async get(sql, params = []) {
          const results = await this.all(sql, params);
          return results[0] || null;
        }
      };
    })();
  } else if (isTauri) {
    // Desktop: Tauri SQLite (only import when actually running in Tauri)
    dbPromise = (async () => {
      try {
        const { Database } = await import('tauri-plugin-sql-api');
        const db = await Database.load('sqlite:bible.sqlite');
        
        return {
          all: (sql, params = []) => db.select(sql, params),
          get: async (sql, params = []) => {
            const rows = await db.select(sql, params);
            return rows[0] || null;
          }
        };
      } catch (error) {
        console.error('Failed to load Tauri SQL plugin:', error);
        throw new Error('Tauri SQL plugin not available');
      }
    })();
  } else {
    // Mobile: Capacitor SQLite
    dbPromise = (async () => {
      try {
        const { CapacitorSQLite } = await import('@capacitor-community/sqlite');
        const sqlite = CapacitorSQLite;
        
        const ret = await sqlite.createConnection('bible', false, 'no-encryption', 1, false);
        await ret.open();
        
        return {
          all: async (sql, params = []) => {
            const result = await ret.query(sql, params);
            return result.values || [];
          },
          get: async (sql, params = []) => {
            const result = await ret.query(sql, params);
            const rows = result.values || [];
            return rows[0] || null;
          }
        };
      } catch (error) {
        console.error('Failed to load Capacitor SQLite plugin:', error);
        throw new Error('Capacitor SQLite plugin not available');
      }
    })();
  }
  
  return dbPromise;
}

// Route SQL queries to appropriate API endpoints for web deployment
async function routeSQLToAPI(sql, params, api) {
  const sqlLower = sql.toLowerCase().trim();
  
  // Books queries
  if (sqlLower.includes('from books')) {
    if (sqlLower.includes('where id')) {
      const bookId = params[0];
      const book = await api.getBook(bookId);
      return book ? [book] : [];
    }
    return await api.getBooks();
  }
  
  // Verses queries
  if (sqlLower.includes('from verses')) {
    if (sqlLower.includes('where book_id') && sqlLower.includes('chapter_number')) {
      const bookId = params[0];
      const chapter = params[1];
      return await api.getVerses(bookId, chapter);
    }
    if (sqlLower.includes('where book_id')) {
      const bookId = params[0];
      return await api.getVerses(bookId);
    }
    if (sqlLower.includes('where id')) {
      const verseId = params[0];
      const verse = await api.getVerse(verseId);
      return verse ? [verse] : [];
    }
  }
  
  // Resources (audio) queries
  if (sqlLower.includes('from resources')) {
    if (sqlLower.includes('verse_resource_link')) {
      // Get audio for specific verse
      const verseId = extractVerseIdFromJoin(sql, params);
      if (verseId) {
        return await api.getAudioForVerse(verseId);
      }
    }
    // General audio resources
    return await api.request('/resources?type=audio');
  }
  
  // Entities queries
  if (sqlLower.includes('from entities')) {
    if (sqlLower.includes('where type')) {
      const entityType = params[0];
      return await api.getEntities(entityType);
    }
    return await api.getEntities();
  }
  
  // Search queries
  if (sqlLower.includes('like') && sqlLower.includes('verses')) {
    const searchTerm = params[0]?.replace(/%/g, '');
    if (searchTerm) {
      return await api.searchVerses(searchTerm);
    }
  }
  
  console.warn('Unhandled SQL query routed to API:', sql);
  return [];
}

function extractVerseIdFromJoin(sql, params) {
  // Extract verse ID from JOIN queries
  const matches = sql.match(/verses?\.id\s*=\s*\?/i);
  if (matches && params.length > 0) {
    return params[0];
  }
  return null;
}
