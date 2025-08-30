// Cloudflare Pages Function - Sync Status API
// /functions/api/sync.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  try {
    const db = env.D1_DATABASE;
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const endpoint = pathSegments[2]; // /api/sync/[endpoint]
    
    if (request.method === 'GET' && endpoint === 'status') {
      // Get sync status and metadata
      const syncInfo = await db.prepare(`
        SELECT last_sync, total_records FROM sync_metadata WHERE id = 1
      `).first();
      
      const bookCount = await db.prepare('SELECT COUNT(*) as count FROM books').first();
      const verseCount = await db.prepare('SELECT COUNT(*) as count FROM verses').first();
      const audioCount = await db.prepare('SELECT COUNT(*) as count FROM resources WHERE type = "audio"').first();
      
      const status = {
        lastSync: syncInfo?.last_sync || null,
        totalRecords: syncInfo?.total_records || 0,
        cached: {
          books: bookCount.count,
          verses: verseCount.count,
          audioResources: audioCount.count
        },
        isStale: syncInfo?.last_sync ? 
          (Date.now() - new Date(syncInfo.last_sync).getTime()) > 7 * 24 * 60 * 60 * 1000 : // 7 days
          true
      };
      
      return new Response(JSON.stringify(status), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (request.method === 'POST' && endpoint === 'trigger') {
      // Trigger manual sync (for testing)
      try {
        const syncWorkerUrl = 'https://bible-sync-worker.your-account.workers.dev/sync';
        const response = await fetch(syncWorkerUrl, { method: 'POST' });
        const result = await response.json();
        
        return new Response(JSON.stringify({
          message: 'Sync triggered successfully',
          result
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: 'Failed to trigger sync',
          message: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Method not allowed', { status: 405 });
    
  } catch (error) {
    console.error('Sync API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
