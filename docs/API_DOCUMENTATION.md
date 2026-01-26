# SoundPath REST API Documentation

## Base URL

```
https://your-project.supabase.co/functions/v1/api/v1
```

## Authentication

All API requests require authentication using an API key. Include your API key in the Authorization header:

```
Authorization: Bearer sk_live_your_api_key_here
```

### Getting an API Key

1. Log in to SoundPath
2. Navigate to **API Keys** (Owner/Manager only)
3. Click **Create API Key**
4. Copy the key immediately - you won't be able to see it again

## Rate Limiting

API calls are rate-limited based on your subscription plan:
- **Free**: No API access
- **Starter**: 50,000 calls/month
- **Pro**: 500,000 calls/month
- **Enterprise**: Unlimited

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per month
- `X-RateLimit-Remaining`: Remaining requests this month
- `X-RateLimit-Reset`: Timestamp when limit resets

## Endpoints

### Tracks

#### List Tracks

```http
GET /tracks
```

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `offset` (optional): Number of results to skip (default: 0)
- `status` (optional): Filter by status (inbox, second_listen, office, contracting, upcoming, vault)
- `artist_id` (optional): Filter by artist ID

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "artist_name": "Artist Name",
      "title": "Track Title",
      "sc_link": "https://soundcloud.com/...",
      "genre": "Electronic",
      "bpm": 128,
      "energy": 5,
      "status": "inbox",
      "votes": 3,
      "created_at": "2026-01-24T10:00:00Z",
      "artists": {
        "name": "Artist Name"
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150,
    "has_more": true
  }
}
```

#### Get Single Track

```http
GET /tracks/{track_id}
```

**Response:**
```json
{
  "id": "uuid",
  "artist_name": "Artist Name",
  "title": "Track Title",
  "sc_link": "https://soundcloud.com/...",
  "genre": "Electronic",
  "bpm": 128,
  "energy": 5,
  "status": "inbox",
  "votes": 3,
  "created_at": "2026-01-24T10:00:00Z",
  "artists": {
    "name": "Artist Name"
  }
}
```

#### Create Track

```http
POST /tracks
Content-Type: application/json

{
  "artist_name": "Artist Name",
  "title": "Track Title",
  "sc_link": "https://soundcloud.com/...",
  "genre": "Electronic",
  "bpm": 128,
  "energy": 5,
  "status": "inbox"
}
```

**Required Fields:**
- `artist_name`: Artist name (string)
- `title`: Track title (string)

**Optional Fields:**
- `sc_link`: SoundCloud link (string)
- `genre`: Genre (string)
- `bpm`: BPM (integer, default: 128)
- `energy`: Energy level 0-5 (integer, default: 0)
- `status`: Status (string, default: "inbox")

**Response:** 201 Created with track object

#### Update Track

```http
PUT /tracks/{track_id}
Content-Type: application/json

{
  "status": "second_listen",
  "energy": 4
}
```

**Response:** 200 OK with updated track object

#### Delete Track

```http
DELETE /tracks/{track_id}
```

**Response:** 200 OK with success message

---

### Artists

#### List Artists

```http
GET /artists
```

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Number of results to skip (default: 0)
- `search` (optional): Search by name

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Artist Name",
      "bio": "Artist bio",
      "primary_genre": "Electronic",
      "created_at": "2026-01-24T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 25,
    "has_more": false
  }
}
```

#### Get Single Artist

```http
GET /artists/{artist_id}
```

#### Create Artist

```http
POST /artists
Content-Type: application/json

{
  "name": "Artist Name",
  "bio": "Artist bio",
  "primary_genre": "Electronic"
}
```

#### Update Artist

```http
PUT /artists/{artist_id}
Content-Type: application/json

{
  "bio": "Updated bio"
}
```

#### Delete Artist

```http
DELETE /artists/{artist_id}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

### Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Example Error Response

```json
{
  "error": "Invalid API key"
}
```

## Webhooks

Webhooks allow you to receive real-time notifications when events occur in your organization.

### Available Events

- `track.created` - New track added
- `track.updated` - Track updated
- `track.deleted` - Track deleted
- `track.moved` - Track moved between phases
- `artist.created` - New artist added
- `artist.updated` - Artist updated
- `vote.added` - Vote added to track
- `subscription.created` - Subscription created
- `subscription.updated` - Subscription updated
- `subscription.canceled` - Subscription canceled

### Webhook Payload

```json
{
  "event": "track.created",
  "timestamp": "2026-01-24T10:00:00Z",
  "data": {
    "id": "uuid",
    "artist_name": "Artist Name",
    "title": "Track Title",
    ...
  }
}
```

### Signature Verification

Each webhook includes a signature header for verification:

```
X-Webhook-Signature: <signature>
X-Webhook-Timestamp: <timestamp>
X-Webhook-Event: <event_type>
```

To verify the signature:

1. Concatenate timestamp and payload: `{timestamp}.{payload}`
2. Create HMAC SHA-256 hash using your webhook secret
3. Compare with `X-Webhook-Signature` header

### Example Verification (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Rate Limiting

If you exceed your rate limit, you'll receive a 429 response:

```json
{
  "error": "API rate limit exceeded"
}
```

Wait until the next billing period or upgrade your plan.

## Support

For API support, contact:
- Email: api@studioos.app
- Documentation: https://docs.studioos.app/api
