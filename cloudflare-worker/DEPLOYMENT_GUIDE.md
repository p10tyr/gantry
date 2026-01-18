# Quick Deployment Guide

## First-Time Setup (5 minutes)

### 1. Install Prerequisites

```bash
# Install Node.js if you haven't already
# Download from: https://nodejs.org/

# Verify installation
node --version
npm --version
```

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 3. Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate with Cloudflare. If you don't have a Cloudflare account, create one (it's free).

### 4. Get Your Account ID

1. Visit https://dash.cloudflare.com/
2. Click on "Workers & Pages" in the left sidebar
3. Your Account ID is displayed on this page
4. Copy it

### 5. Configure the Worker

Edit `wrangler.toml` and add your account ID:

```toml
account_id = "paste-your-account-id-here"
```

### 6. Deploy!

```bash
cd cloudflare-worker
wrangler deploy
```

You'll see output like:
```
Published osm-api-proxy (0.52 sec)
  https://osm-api-proxy.your-subdomain.workers.dev
```

**Copy this URL** - you'll need it for your frontend configuration.

## Update Your Frontend

### Option A: For GitHub Pages (Production)

Edit your `oauth.js` file and update these URLs:

```javascript
const DEFAULT_OAUTH_CONFIG = {
    authorizationUrl: 'https://www.onlinescoutmanager.co.uk/oauth/authorize',
    tokenUrl: 'https://osm-api-proxy.your-subdomain.workers.dev/oauth/token',
    resourceUrl: 'https://osm-api-proxy.your-subdomain.workers.dev/oauth/resource',
    clientId: '',  // Set via settings panel
    redirectUri: 'https://p10tyr.github.io/gantry/',
    scope: 'section:member:read'
};
```

Edit your `osm-api.js` file:

```javascript
async function fetchOSMMembers(sectionId = '29675', termId = '-1', section = 'cubs') {
    const url = `https://osm-api-proxy.your-subdomain.workers.dev/api/osm/members?action=getListOfMembers&sort=dob&sectionid=${sectionId}&termid=${termId}&section=${section}`;
    
    const accessToken = getAccessToken();

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`OSM API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // ... rest of your code
}
```

### Option B: Environment-Aware Configuration (Recommended)

Create a config file that automatically detects the environment:

```javascript
// config.js
const isProduction = window.location.hostname === 'p10tyr.github.io';
const WORKER_URL = isProduction 
    ? 'https://osm-api-proxy.your-subdomain.workers.dev'
    : 'http://localhost:8787';  // For local testing

const DEFAULT_OAUTH_CONFIG = {
    authorizationUrl: 'https://www.onlinescoutmanager.co.uk/oauth/authorize',
    tokenUrl: `${WORKER_URL}/oauth/token`,
    resourceUrl: `${WORKER_URL}/oauth/resource`,
    clientId: '',
    redirectUri: isProduction 
        ? 'https://p10tyr.github.io/gantry/'
        : 'https://localhost:8443/',
    scope: 'section:member:read'
};
```

## Testing

### Test CORS

```bash
curl -X OPTIONS https://osm-api-proxy.your-subdomain.workers.dev/api/osm/members \
  -H "Origin: https://p10tyr.github.io" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

You should see CORS headers in the response.

### Monitor Logs

Open a terminal and run:

```bash
wrangler tail
```

Then make requests from your app and watch the logs in real-time.

## Common Issues

### "Authentication required"
Run `wrangler login` again.

### "Account ID not found"
Make sure you've added your account ID to `wrangler.toml`.

### "Origin not allowed" in browser
1. Check the Origin in browser DevTools (Network tab)
2. Verify it matches one of the ALLOWED_ORIGINS in worker.js
3. Update worker.js if needed and redeploy

### Worker not updating
- Wait 30 seconds for global propagation
- Hard refresh your browser (Ctrl+Shift+R)
- Check `wrangler tail` for errors

## Next Steps

1. ✅ Deploy the worker
2. ✅ Update frontend URLs
3. ✅ Update OSM OAuth redirect URI to your GitHub Pages URL
4. ✅ Test the OAuth flow
5. ✅ Test member data loading

## Updating the Worker

Whenever you make changes to `worker.js`:

```bash
wrangler deploy
```

Changes are live globally within seconds.

## Support

- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **This project**: Open an issue on GitHub
