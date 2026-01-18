/**
 * Cloudflare Worker - OSM API Proxy
 * 
 * This worker acts as a secure proxy for Online Scout Manager (OSM) API calls
 * Security features:
 * - CORS restricted to specific origins (GitHub Pages + localhost)
 * - Destination URL whitelist (only OSM domains)
 * - Request validation
 */

// ============================================
// Configuration
// ============================================

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://p10tyr.github.io',
  'http://localhost:8443',
  'https://localhost:8443',
  'http://127.0.0.1:8443',
  'https://127.0.0.1:8443',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// Allowed OSM API endpoints (whitelist)
const ALLOWED_OSM_ENDPOINTS = {
  // OAuth endpoints
  tokenUrl: 'https://www.onlinescoutmanager.co.uk/oauth/token',
  resourceUrl: 'https://www.onlinescoutmanager.co.uk/oauth/resource',
  
  // Member API base
  apiBase: 'https://www.onlinescoutmanager.co.uk/ext/members/contact/'
};

// ============================================
// Main Request Handler
// ============================================

export default {
  async fetch(request, env, ctx) {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCORS(request);
      }

      // Validate origin
      const origin = request.headers.get('Origin');
      if (!isOriginAllowed(origin)) {
        return new Response('Forbidden: Origin not allowed', { 
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Parse the request URL
      const url = new URL(request.url);
      const path = url.pathname;

      // Route to appropriate handler
      if (path.startsWith('/oauth/token')) {
        return await handleTokenRequest(request, origin, env);
      } else if (path.startsWith('/oauth/resource')) {
        return await handleResourceRequest(request, origin, env);
      } else if (path.startsWith('/api/osm/members')) {
        return await handleMembersRequest(request, origin, env);
      } else {
        return new Response('Not Found', { 
          status: 404,
          headers: corsHeaders(origin)
        });
      }

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Internal Server Error: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};

// ============================================
// OAuth Token Handler
// ============================================

async function handleTokenRequest(request, origin, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders(origin)
    });
  }

  try {
    // Forward the token request to OSM
    const response = await fetch(ALLOWED_OSM_ENDPOINTS.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type'),
        'Accept': 'application/json'
      },
      body: await request.text()
    });

    // Get response data
    const data = await response.text();
    
    // Create response with CORS headers
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Token request error:', error);
    return new Response(`Token request failed: ${error.message}`, {
      status: 500,
      headers: corsHeaders(origin)
    });
  }
}

// ============================================
// OAuth Resource Handler (User Info)
// ============================================

async function handleResourceRequest(request, origin, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders(origin)
    });
  }

  try {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', {
        status: 401,
        headers: corsHeaders(origin)
      });
    }

    // Forward the resource request to OSM
    const response = await fetch(ALLOWED_OSM_ENDPOINTS.resourceUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Resource request error:', error);
    return new Response(`Resource request failed: ${error.message}`, {
      status: 500,
      headers: corsHeaders(origin)
    });
  }
}

// ============================================
// Members API Handler
// ============================================

async function handleMembersRequest(request, origin, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders(origin)
    });
  }

  try {
    // Extract query parameters
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const sectionId = url.searchParams.get('sectionid');
    const termId = url.searchParams.get('termid');
    const section = url.searchParams.get('section');

    // Validate required parameters
    if (!action || !sectionId || !termId || !section) {
      return new Response('Bad Request: Missing required parameters', {
        status: 400,
        headers: corsHeaders(origin)
      });
    }

    // Validate action parameter (whitelist)
    if (action !== 'getListOfMembers') {
      return new Response('Bad Request: Invalid action', {
        status: 400,
        headers: corsHeaders(origin)
      });
    }

    // Extract Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', {
        status: 401,
        headers: corsHeaders(origin)
      });
    }

    // Build OSM API URL
    const osmUrl = `${ALLOWED_OSM_ENDPOINTS.apiBase}?action=${action}&sectionid=${sectionId}&termid=${termId}&section=${section}&sort=dob`;

    // Forward request to OSM API
    const response = await fetch(osmUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Members request error:', error);
    return new Response(`Members request failed: ${error.message}`, {
      status: 500,
      headers: corsHeaders(origin)
    });
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin) {
  if (!origin) return false;
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  
  // Check if origin starts with allowed GitHub Pages domain
  if (origin.startsWith('https://p10tyr.github.io')) {
    return true;
  }
  
  return false;
}

/**
 * Generate CORS headers
 */
function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
  
  // Only set Allow-Origin if origin is allowed
  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(request) {
  const origin = request.headers.get('Origin');
  
  if (!isOriginAllowed(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}
