// OAuth Configuration for Online Scout Manager (OSM)
const OAUTH_CONFIG = {
    authorizationUrl: 'https://www.onlinescoutmanager.co.uk/oauth/authorize',
    tokenUrl: 'https://www.onlinescoutmanager.co.uk/oauth/token',
    resourceUrl: 'https://www.onlinescoutmanager.co.uk/oauth/resource',
    clientId: 'Y3mbA3SF13Vqvfv3AdEaS7inyN7YbrS6',
    redirectUri: 'https://localhost:8443/',
    scope: 'section:member:read'
};

// Storage keys
const STORAGE_KEYS = {
    accessToken: 'osm_access_token',
    refreshToken: 'osm_refresh_token',
    userInfo: 'osm_user_info',
    state: 'osm_oauth_state',
    codeVerifier: 'osm_code_verifier'
};

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate PKCE code verifier (random string)
 */
function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode (without padding)
 */
function base64URLEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Initiate OAuth login flow with PKCE
 */
async function initiateOAuthLogin() {
    if (!OAUTH_CONFIG.clientId) {
        alert('OAuth Client ID not configured. Please add your OSM client ID to oauth.js');
        return;
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store state and code verifier for later verification
    sessionStorage.setItem(STORAGE_KEYS.state, state);
    sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: OAUTH_CONFIG.clientId,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        scope: OAUTH_CONFIG.scope,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });

    window.location.href = `${OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;
}

/**
 * Handle OAuth callback after user authorization
 */
async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check if this is an OAuth callback
    if (!code && !error) {
        return false;
    }

    // Handle error
    if (error) {
        console.error('OAuth error:', error);
        showError(`OAuth authentication failed: ${error}`);
        cleanupOAuthParams();
        return true;
    }

    // Verify state parameter
    const savedState = sessionStorage.getItem(STORAGE_KEYS.state);
    if (state !== savedState) {
        console.error('State mismatch - possible CSRF attack');
        showError('Authentication failed: Invalid state parameter');
        cleanupOAuthParams();
        return true;
    }

    // Exchange code for tokens
    try {
        await exchangeCodeForTokens(code);
        cleanupOAuthParams();
        return true;
    } catch (err) {
        console.error('Token exchange failed:', err);
        showError(`Authentication failed: ${err.message}`);
        cleanupOAuthParams();
        return true;
    }
}

/**
 * Exchange authorization code for access and refresh tokens using PKCE
 */
async function exchangeCodeForTokens(code) {
    const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);
    
    if (!codeVerifier) {
        throw new Error('Code verifier not found - PKCE flow interrupted');
    }
    
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        client_id: OAUTH_CONFIG.clientId,
        code_verifier: codeVerifier
    });

    // Use local proxy to avoid CORS issues
    const proxyUrl = window.location.origin + '/oauth/token';
    
    const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Store tokens
    localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
    if (data.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
    }
    
    // Clear code verifier after successful exchange
    sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);

    // Get user info
    await fetchUserInfo(data.access_token);
    
    // Update UI
    updateAuthUI();
}

/**
 * Fetch user information from OSM
 */
async function fetchUserInfo(accessToken) {
    // Use local proxy to avoid CORS issues
    const proxyUrl = window.location.origin + '/oauth/resource';
    
    const response = await fetch(proxyUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userInfo = await response.json();
    localStorage.setItem(STORAGE_KEYS.userInfo, JSON.stringify(userInfo));
    
    return userInfo;
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: OAUTH_CONFIG.clientId
    });

    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!response.ok) {
        // Refresh failed - clear tokens and require re-login
        logout();
        throw new Error('Token refresh failed - please log in again');
    }

    const data = await response.json();
    localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
    
    if (data.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
    }

    return data.access_token;
}

/**
 * Logout and clear all stored tokens
 */
function logout() {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.userInfo);
    sessionStorage.removeItem(STORAGE_KEYS.state);
    sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
    
    updateAuthUI();
}

/**
 * Check if user is currently authenticated
 */
function isAuthenticated() {
    return !!localStorage.getItem(STORAGE_KEYS.accessToken);
}

/**
 * Get stored user information
 */
function getUserInfo() {
    const userInfoJson = localStorage.getItem(STORAGE_KEYS.userInfo);
    return userInfoJson ? JSON.parse(userInfoJson) : null;
}

/**
 * Update UI based on authentication state
 */
function updateAuthUI() {
    const loginBtn = document.getElementById('oauth-login-btn');
    const logoutBtn = document.getElementById('oauth-logout-btn');
    const userInfo = document.getElementById('oauth-user-info');

    if (isAuthenticated()) {
        const user = getUserInfo();
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        
        if (userInfo && user) {
            userInfo.style.display = 'inline-block';
            userInfo.innerHTML = `
                <i class="bi bi-person-circle me-1"></i>
                <span class="text-muted small">${user.name || user.email || 'Logged in'}</span>
            `;
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
    }
}

/**
 * Clean up OAuth parameters from URL
 */
function cleanupOAuthParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    window.history.replaceState({}, document.title, url.toString());
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (errorDiv && errorText) {
        errorDiv.classList.remove('d-none');
        errorText.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i><strong>OAuth Error:</strong> ${message}`;
    } else {
        alert(message);
    }
}

// Initialize OAuth on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Handle OAuth callback if present
    const isCallback = await handleOAuthCallback();
    
    // Update UI
    updateAuthUI();
    
    // Setup event listeners
    const loginBtn = document.getElementById('oauth-login-btn');
    const logoutBtn = document.getElementById('oauth-logout-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', initiateOAuthLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
