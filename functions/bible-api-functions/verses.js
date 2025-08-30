// Cloudflare Pages Function - Verses API  
// /functions/api/verses.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  try {
    const db = env.D1_DATABASE;
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const verseId = pathSegments[2]; // /api/verses/[verseId]
    
    if (request.method === 'GET') {
      if (verseId) {
        // Get specific verse with book and chapter info
        const verse = await db.prepare(`
          SELECT * FROM verses WHERE id = ?
        `).bind(verseId).first();
        
        if (!verse) {
          return new Response(JSON.stringify({ error: 'Verse not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify(verse), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Get verses with optional filters
        const bookId = url.searchParams.get('book_id');
        const chapter = url.searchParams.get('chapter');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        
        let query = 'SELECT * FROM verses';
        let params = [];
        let conditions = [];
        
        if (bookId) {
          conditions.push('book_id = ?');
          params.push(bookId);
        }
        
        if (chapter) {
          conditions.push('chapter_number = ?');
          params.push(chapter);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY book_id, chapter_number, verse_number LIMIT ?';
        params.push(limit);
        
        const verses = await db.prepare(query).bind(...params).all();
        
        return new Response(JSON.stringify(verses.results), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (request.method === 'POST') {
      // Search verses
      const { query: searchQuery } = await request.json();
      
      if (!searchQuery || searchQuery.trim().length < 2) {
        return new Response(JSON.stringify({ error: 'Search query too short' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const results = await db.prepare(`
        SELECT * FROM verses 
        WHERE text LIKE ? OR book_name LIKE ?
        ORDER BY book_id, chapter_number, verse_number 
        LIMIT 50
      `).bind(`%${searchQuery}%`, `%${searchQuery}%`).all();
      
      return new Response(JSON.stringify(results.results), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Method not allowed', { status: 405 });
    
  } catch (error) {
    console.error('Verses API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
