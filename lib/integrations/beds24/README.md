# Beds24 Provider Adapter

**Phase 2 — Inbound only, read-only. No write-back.**

## Architecture

OTA -> Beds24 -> ARSAVAYA Connectivity Layer -> ARSAVAYA PMS

## Verified API facts

| Item | Value |
|---|---|
| Base URL | https://api.beds24.com/v2 |
| Auth header | token: {BEDS24_READ_TOKEN} |
| Pagination | pages.nextPageExists / pages.nextPageLink |
| Rate limit | 100 credits / 5 min per account |

## Required scopes (read-only)

- read:properties
- read:bookings
- read:bookings-personal
- read:bookings-financial

## Cloudflare secret

Reference env var BEDS24_READ_TOKEN in .openai/hosting.json or wrangler config.

Never commit this value. Never send it to the browser.

## Endpoints used

| Endpoint | Purpose |
|---|---|
| GET /properties?includeAllRooms=true | Fetch properties + rooms |
| GET /bookings | List reservations (paginated) |
| GET /bookings?id=X | Single reservation |

## Sync flow

1. Operator confirms unit mappings.
2. Manual Sync Now triggers POST /api/integrations/beds24 with action: sync.
3. Adapter fetches reservations, reconciles, applies to pms_workspace under CAS.
4. Sync run recorded in sync_runs.

## What ARSAVAYA does NOT manage

- OTA to Beds24 mapping (Booking.com, Airbnb, Agoda, etc.) - done in Beds24 control panel
- Rate / availability / min-stay write-back
- Webhooks (future phase)
- Direct OTA APIs
- Scheduled worker (future phase)

## Cursor / watermark

- Cursor is a JSON string (opaque to core).
- Contains lastModifiedAt + syncedAt.
- UNVERIFIED: Beds24 modifiedFrom query parameter - see query.ts (USE_MODIFIED_FROM = false). Falls back to bounded date-range polling until verified against live Swagger.

## Idempotency

- Entity key: entity|beds24|{account}|reservation|{bookingId}
- Event key: prefer externalUpdatedAt based fingerprint.
- integration_events.dedupe_key UNIQUE prevents duplicates on polling.