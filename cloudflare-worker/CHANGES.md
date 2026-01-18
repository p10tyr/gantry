# Changes Made - Cloudflare Worker Integration

## Summary

The application has been updated to use the Cloudflare Worker proxy (`osm-api-proxy.piotr-e9a.workers.dev`) instead of local Python proxy for API calls.

## Files Modified

### 1. Frontend Files

#### `index.html`
- ✅ Added "Cloudflare Worker Proxy URL" input field to Settings panel
- ✅ Field is pre-populated with `osm-api-proxy.piotr-e9a.workers.dev`
- ✅ Reorganized settings layout for better UX

#### `oauth.js`
- ✅ Updated `DEFAULT_OAUTH_CONFIG` to include `proxyUrl` instead of hardcoded URLs
- ✅ Modified `getOAuthConfig()` to build token/resource URLs from proxy base
- ✅ Updated `loadSettingsUI()` to load proxy URL from localStorage
- ✅ Updated `saveSettings()` to save proxy URL to localStorage
- ✅ Updated `resetSettings()` to clear proxy URL

#### `osm-api.js`
- ✅ Changed `fetchOSMMembers()` to use `config.apiBase` from OAuth config
- ✅ URLs now point to Cloudflare Worker instead of `/api/osm/members`

#### `README.md`
- ✅ Added "OSM Live Import" section with setup instructions
- ✅ Added "Local Development" section explaining HTTPS server usage
- ✅ Documents the Cloudflare Worker proxy configuration

### 2. Backend/Dev Files

#### `dev/https_server.py`
- ℹ️ No changes needed - already just serves static files
- ℹ️ Proxy functionality removed (now handled by Cloudflare Worker)

## How It Works Now

### Production (GitHub Pages)
1. User visits `https://p10tyr.github.io/gantry/`
2. Settings are configured with:
   - Proxy URL: `osm-api-proxy.piotr-e9a.workers.dev`
   - OAuth Client ID (from OSM)
   - Redirect URI: `https://p10tyr.github.io/gantry/`
3. All API calls go through Cloudflare Worker:
   - OAuth token exchange: `https://osm-api-proxy.piotr-e9a.workers.dev/oauth/token`
   - User info: `https://osm-api-proxy.piotr-e9a.workers.dev/oauth/resource`
   - Member API: `https://osm-api-proxy.piotr-e9a.workers.dev/api/osm/members`

### Local Development
1. User runs `python dev/https_server.py`
2. Visits `https://localhost:8443/`
3. Same Cloudflare Worker proxy is used for API calls
4. Local server only serves static HTML/JS/CSS files

## Security Features

✅ **Origin Whitelist**: Worker only accepts requests from:
- `https://p10tyr.github.io`
- `localhost` variants (for development)

✅ **Destination Whitelist**: Worker only proxies to:
- OSM OAuth endpoints
- OSM Member API endpoints

✅ **No Secrets in Frontend**: All OAuth secrets remain in OSM configuration

## Migration Notes

### What Was Removed
- ❌ Local Python proxy logic (no longer needed)
- ❌ Hardcoded API URLs in `oauth.js`
- ❌ Direct calls to `/api/osm/members` endpoint

### What Was Added
- ✅ Cloudflare Worker proxy configuration
- ✅ Dynamic URL building based on proxy setting
- ✅ UI for configuring proxy URL
- ✅ Default proxy URL pre-populated

## Testing Checklist

- [ ] Settings panel loads with pre-populated proxy URL
- [ ] Save Settings stores proxy URL in localStorage
- [ ] Reset Settings clears proxy URL and reloads default
- [ ] OAuth login redirects to correct authorization URL
- [ ] OAuth token exchange uses Cloudflare Worker
- [ ] User info fetch uses Cloudflare Worker
- [ ] Member data fetch uses Cloudflare Worker
- [ ] CORS headers are properly set
- [ ] Local HTTPS server works for development

## Next Steps

1. Test the OAuth flow end-to-end
2. Verify member data loading works
3. Update OSM OAuth app redirect URI to match GitHub Pages URL
4. Deploy to GitHub Pages
5. Monitor Cloudflare Worker logs for any issues

## Troubleshooting

### "Origin not allowed"
- Check browser console for actual Origin being sent
- Verify it matches one in `cloudflare-worker/worker.js` ALLOWED_ORIGINS
- Update worker and redeploy if needed

### "Proxy URL not configured"
- Open Settings panel
- Enter: `osm-api-proxy.piotr-e9a.workers.dev`
- Click Save Settings

### OAuth redirect fails
- Ensure Redirect URI in Settings matches OSM OAuth app configuration
- For GitHub Pages: `https://p10tyr.github.io/gantry/`
- For local: `https://localhost:8443/`
