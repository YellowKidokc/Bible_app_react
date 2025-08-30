// Cloudflare Pages Function - Audio Resources API
// /functions/api/audio.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  try {
    const db = env.D1_DATABASE;
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    if (request.method === 'GET') {
      const bookId = url.searchParams.get('book_id');
      const verseId = url.searchParams.get('verse_id');
      
      if (verseId) {
        // Get audio resources for a specific verse
        const audioResources = await db.prepare(`
          SELECT r.* FROM resources r
          JOIN verse_resource_links vrl ON vrl.resource_id = r.id
          WHERE vrl.verse_id = ? AND r.type = 'audio'
          ORDER BY vrl.relevance DESC
        `).bind(verseId).all();
        
        return new Response(JSON.stringify(audioResources.results), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (bookId) {
        // Get all audio resources for a book
        const audioResources = await db.prepare(`
          SELECT DISTINCT r.* FROM resources r
          JOIN verse_resource_links vrl ON vrl.resource_id = r.id
          JOIN verses v ON v.id = vrl.verse_id
          WHERE v.book_id = ? AND r.type = 'audio'
          ORDER BY r.title
        `).bind(bookId).all();
        
        return new Response(JSON.stringify(audioResources.results), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Get all audio resources
        const audioResources = await db.prepare(`
          SELECT * FROM resources WHERE type = 'audio' 
          ORDER BY created_at DESC LIMIT 100
        `).all();
        
        return new Response(JSON.stringify(audioResources.results), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Method not allowed', { status: 405 });
    
  } catch (error) {
    console.error('Audio API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
