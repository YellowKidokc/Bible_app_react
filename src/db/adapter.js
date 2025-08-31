/**
 * Web-first Database adapter 
 * Uses API calls for web deployment, direct database for desktop/mobile
 */

let dbPromise = null;

export async function createDB() {
  if (dbPromise) return dbPromise;

  const isBrowser = typeof window !== 'undefined';
  const isTauri = isBrowser && '__TAURI__' in window;
  const isCap = isBrowser && window.Capacitor?.isNativePlatform?.();

  if (!isTauri && !isCap) {
    dbPromise = Promise.resolve(new WebAPIAdapter());
    return dbPromise;
  }

  dbPromise = createNativeDB({ isTauri, isCap });
  return dbPromise;
}

// Web API Adapter - no imports, just fetch calls
class WebAPIAdapter {
  async all(sql, params = []) {
    return await this.routeSQLToAPI(sql, params);
  }
  
  async get(sql, params = []) {
    const results = await this.all(sql, params);
    return results[0] || null;
  }
  
  async routeSQLToAPI(sql, params) {
    const sqlLower = sql.toLowerCase().trim();
    
    try {
      // Books queries
      if (sqlLower.includes('from books')) {
        if (sqlLower.includes('where id') && params.length > 0) {
          const response = await fetch(`/api/books?id=${params[0]}`);
          const book = await response.json();
          return book ? [book] : [];
        }
        const response = await fetch('/api/books');
        return await response.json();
      }
      
      // Verses queries
      if (sqlLower.includes('from verses')) {
        if (sqlLower.includes('where book_id') && sqlLower.includes('chapter_number')) {
          const bookId = params[0];
          const chapter = params[1];
          const response = await fetch(`/api/verses?book_id=${bookId}&chapter=${chapter}`);
          return await response.json();
        }
        if (sqlLower.includes('where book_id') && params.length > 0) {
          const response = await fetch(`/api/verses?book_id=${params[0]}`);
          return await response.json();
        }
        if (sqlLower.includes('where id') && params.length > 0) {
          const response = await fetch(`/api/verses?id=${params[0]}`);
          const result = await response.json();
          return result ? [result] : [];
        }
        if (sqlLower.includes('like') && params.length > 0) {
          const searchTerm = params[0]?.replace(/%/g, '');
          const response = await fetch('/api/verses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchTerm })
          });
          return await response.json();
        }
      }
      
      // Resources (audio) queries
      if (sqlLower.includes('from resources') || sqlLower.includes('verse_resource_link')) {
        const response = await fetch('/api/audio');
        return await response.json();
      }
      
      console.warn('Unhandled SQL query:', sql);
      return [];
      
    } catch (error) {
      console.error('API call failed:', error);
      return [];
    }
  }
}

// Native DB creation (only called when not in web environment)
async function createNativeDB({ isTauri, isCap }) {
  if (isTauri) {
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
      throw error;
    }
  }

  if (isCap) {
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
      throw error;
    }
  }

  throw new Error('No supported database adapter found');
}
