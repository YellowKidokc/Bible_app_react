// Bible Audio Streaming Worker
// Handles MP3 streaming with range requests and authentication

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    };
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // Audio streaming endpoint
    if (url.pathname.startsWith('/audio/')) {
      return handleAudioRequest(request, env, corsHeaders);
    }
    
    // Default response
    return new Response('Bible Audio Streaming Service', {
      headers: { 'Content-Type': 'text/plain', ...corsHeaders }
    });
  }
};

async function handleAudioRequest(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const audioKey = url.pathname.replace('/audio/', '');
    
    if (!audioKey) {
      return new Response('Audio file not specified', { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // Get the object from R2
    const object = await env.AUDIO_BUCKET.get(audioKey);
    
    if (!object) {
      return new Response('Audio file not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    
    // Handle range requests for audio seeking
    const rangeHeader = request.headers.get('range');
    
    if (rangeHeader) {
      return handleRangeRequest(object, rangeHeader, corsHeaders);
    } else {
      // Full file request
      return new Response(object.body, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': object.size.toString(),
          'Cache-Control': 'public, max-age=3600',
          'Accept-Ranges': 'bytes',
          ...corsHeaders
        }
      });
    }
    
  } catch (error) {
    console.error('Error handling audio request:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

async function handleRangeRequest(object, rangeHeader, corsHeaders) {
  // Parse range header (e.g., "bytes=0-1023")
  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  
  if (!rangeMatch) {
    return new Response('Invalid range header', { 
      status: 400, 
      headers: corsHeaders 
    });
  }
  
  const start = parseInt(rangeMatch[1]);
  const end = rangeMatch[2] ? parseInt(rangeMatch[2]) : object.size - 1;
  
  // Validate range
  if (start >= object.size || end >= object.size || start > end) {
    return new Response('Range not satisfiable', {
      status: 416,
      headers: {
        'Content-Range': `bytes */${object.size}`,
        ...corsHeaders
      }
    });
  }
  
  // Get the requested range
  const rangeObject = await object.slice(start, end + 1);
  const contentLength = end - start + 1;
  
  return new Response(rangeObject.body, {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': contentLength.toString(),
      'Content-Range': `bytes ${start}-${end}/${object.size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      ...corsHeaders
    }
  });
}
