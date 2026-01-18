# OSM API Cloudflare Worker Proxy

This Cloudflare Worker acts as a secure proxy for the Online Scout Manager (OSM) API, enabling your GitHub Pages site to make authenticated API calls without CORS issues.

## Security Features

✅ **Origin Whitelist**: Only accepts requests from:
- `https://p10tyr.github.io/gantry/`
- `localhost` (for development)

✅ **Destination Whitelist**: Only proxies requests to:
- OSM OAuth endpoints (`/oauth/token`, `/oauth/resource`)
- OSM Member API (`/ext/members/contact/`)

✅ **Request Validation**: Validates all parameters and headers

## Prerequisites

1. A Cloudflare account (free tier works)
2. Node.js installed (v16 or later)
3. npm or pnpm package manager

## Installation & Deployment

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for you to authenticate with Cloudflare.

### Step 3: Configure Your Account ID

1. Go to https://dash.cloudflare.com/
2. Navigate to Workers & Pages
3. Copy your Account ID
4. Edit `wrangler.toml` and uncomment the `account_id` line:
   ```toml
   account_id = "your-account-id-here"
   ```

### Step 4: Deploy the Worker

```bash
cd cloudflare-worker
wrangler deploy
```

This will deploy your worker and give you a URL like:
`https://osm-api-proxy.your-subdomain.workers.dev`

### Step 5: Test the Worker

You can test the worker is running:

```bash
curl https://osm-api-proxy.your-subdomain.workers.dev/
```

You should see a 404 response (which is correct - you need to use the proper endpoints).

## API Endpoints

Once deployed, your worker provides these endpoints:

### 1. OAuth Token Exchange
```
POST https://osm-api-proxy.your-subdomain.workers.dev/oauth/token
```

Forwards token exchange requests to OSM.

### 2. OAuth User Info
```
GET https://osm-api-proxy.your-subdomain.workers.dev/oauth/resource
Authorization: Bearer {access_token}
```

Fetches user information from OSM.

### 3. Members API
```
GET https://osm-api-proxy.your-subdomain.workers.dev/api/osm/members
Authorization: Bearer {access_token}
?action=getListOfMembers&sectionid={id}&termid={id}&section={type}
```

Fetches member list from OSM.

## Updating Your Frontend Code

Once deployed, update your frontend code to use the worker URL instead of direct OSM API calls.

### Update `oauth.js`

Change the OAuth config to use your worker URL:

```javascript
const DEFAULT_OAUTH_CONFIG = {
    authorizationUrl: 'https://www.onlinescoutmanager.co.uk/oauth/authorize',  // Keep this - browser redirect
    tokenUrl: 'https://osm-api-proxy.your-subdomain.workers.dev/oauth/token',  // Changed
    resourceUrl: 'https://osm-api-proxy.your-subdomain.workers.dev/oauth/resource',  // Changed
    clientId: '',
    redirectUri: 'https://p10tyr.github.io/gantry/',  // Update to your GitHub Pages URL
    scope: 'section:member:read'
};
```

### Update `osm-api.js`

Change the members API URL:

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
    
    // ... rest of the code
}
```

## Development & Testing

### Local Development

Test the worker locally before deploying:

```bash
wrangler dev
```

This starts a local server (usually at `http://localhost:8787`). You can then test your endpoints:

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:8787/api/osm/members \
  -H "Origin: https://p10tyr.github.io" \
  -H "Access-Control-Request-Method: GET"
```

### View Logs

Monitor your worker in real-time:

```bash
wrangler tail
```

### Update the Worker

After making changes:

```bash
wrangler deploy
```

## Adding More Origins

To allow additional origins (e.g., a custom domain), edit `worker.js`:

```javascript
const ALLOWED_ORIGINS = [
  'https://p10tyr.github.io',
  'https://your-custom-domain.com',  // Add your domain
  'http://localhost:8443',
  // ... other localhost variants
];
```

Then redeploy:

```bash
wrangler deploy
```

## Monitoring & Analytics

View worker analytics in the Cloudflare dashboard:
1. Go to Workers & Pages
2. Click on your worker (`osm-api-proxy`)
3. View Metrics, Logs, and Errors

## Cost

Cloudflare Workers Free Tier includes:
- 100,000 requests per day
- 10ms CPU time per request

This should be more than sufficient for a scout group application. If you need more, paid plans start at $5/month for 10 million requests.

## Security Notes

1. **Never commit your Account ID** if your repository is public
2. The worker automatically validates all origins and destinations
3. All OAuth client secrets should be configured in OSM, not in the worker
4. The worker uses PKCE (Proof Key for Code Exchange) for secure OAuth flows

## Troubleshooting

### Issue: "Origin not allowed"
- Check that your GitHub Pages URL exactly matches the ALLOWED_ORIGINS list
- Verify the request includes an `Origin` header

### Issue: "Unauthorized"
- Ensure the Authorization header is being passed correctly
- Check that the access token hasn't expired

### Issue: Worker not updating
- Wait a few seconds after deployment (global CDN propagation)
- Clear your browser cache
- Check `wrangler tail` for errors

## Support

For Cloudflare Workers documentation:
- https://developers.cloudflare.com/workers/

For OSM API documentation:
- Contact OSM support or check your OSM API documentation
