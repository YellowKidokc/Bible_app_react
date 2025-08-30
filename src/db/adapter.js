/**
 * Database adapter that works across Web, Mobile, and Desktop
 * - Web: SQLite WASM (sql.js)
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
    // Web: SQLite WASM
    dbPromise = (async () => {
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs({ 
        // Serve wasm from public/ for reliability across dev and production builds
        locateFile: () => `/sql-wasm.wasm` 
      });
      
      const response = await fetch('/db/bible.sqlite');
      const buffer = await response.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buffer));
      
      return {
        all(sql, params = []) {
          try {
            const stmt = db.prepare(sql);
            const result = [];
            stmt.bind(params);
            while (stmt.step()) {
              result.push(stmt.getAsObject());
            }
            stmt.free();
            return Promise.resolve(result);
          } catch (e) {
            return Promise.reject(e);
          }
        },
        
        get(sql, params = []) {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            const result = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();
            return Promise.resolve(result);
          } catch (e) {
            return Promise.reject(e);
          }
        }
      };
    })();
  } else if (isTauri) {
    // Desktop: Tauri SQLite
    dbPromise = (async () => {
      const { Database } = await import('tauri-plugin-sql-api');
      const db = await Database.load('sqlite:bible.sqlite');
      
      return {
        all: (sql, params = []) => db.select(sql, params),
        get: async (sql, params = []) => {
          const rows = await db.select(sql, params);
          return rows[0] || null;
        }
      };
    })();
  } else {
    // Mobile: Capacitor SQLite
    dbPromise = (async () => {
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
    })();
  }
  
  return dbPromise;
}
