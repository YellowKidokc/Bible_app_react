// Cloudflare Pages Function - Books API
// /functions/api/books.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  try {
    // Get D1 database connection
    const db = env.D1_DATABASE;
    
    // Handle different endpoints
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const bookId = pathSegments[2]; // /api/books/[bookId]
    
    if (request.method === 'GET') {
      if (bookId) {
        // Get specific book
        const book = await db.prepare('SELECT * FROM books WHERE id = ?')
          .bind(bookId)
          .first();
          
        if (!book) {
          return new Response(JSON.stringify({ error: 'Book not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify(book), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Get all books
        const books = await db.prepare('SELECT * FROM books ORDER BY book_order')
          .all();
          
        return new Response(JSON.stringify(books.results), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Method not allowed', { status: 405 });
    
  } catch (error) {
    console.error('Books API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
