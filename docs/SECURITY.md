# ARSAVAYA PMS — Security Runbook

## Authentication

Production auth = **Cloudflare Access JWT** (`Cf-Access-Jwt-Assertion` header).

Verified by application using `jose`:
- Signature (via Cloudflare JWKS)
- Issuer (`https://arsavaya.cloudflareaccess.com`)
- Audience (App 1 AUD tag)
- Expiration

**Fail closed:** any error → `getApplicationContext()` returns `null` → API returns 401.

## Route Invariants

| Route Pattern | Reserved For | Auth |
|---|---|---|
| `/api/calendar/<64-hex-token>` | Public iCal feed (OTA fetch) | Token (app-level) |
| `/api/calendar/*` (other paths) | **FORBIDDEN** for new routes | — |
| `/api/integrations/*` | Staff operator APIs | Cloudflare Access |
| `/api/pms` | Staff PMS API | Cloudflare Access |
| `/api/auth/*` | Sign in/out | Cloudflare Access |

**HARD RULE:** Never place authenticated endpoints under `/api/calendar/<child-path>`. That namespace is bypassed at Access layer.

## Secrets Inventory

| Secret | Source | Rotation Trigger |
|---|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | Zero Trust dashboard | Rare — only if team domain changes |
| `CF_ACCESS_APP_AUD` | Access App 1 overview | Only if Access App recreated |
| `BEDS24_READ_TOKEN` | Beds24 control panel | If token leaked; periodic rotation recommended |

## Secret Handling Rules

- Never commit secrets to Git
- Never log secret values
- Never return secrets in API responses
- Never expose secrets in client-side bundles
- Use `wrangler secret put` for production injection (not `wrangler.prod.jsonc`)

## D1 Recovery

**Primary (short-term):** Cloudflare D1 Time Travel — 7 days on Free plan.

**Secondary (long-term):** SQL export (`backups/`).

**Emergency restore:** Time Travel bookmark. See `docs/DEPLOYMENT.md`.

## Access Policy Management

**Initial admin:** Single email in `Allow initial admin` policy.

**Adding staff:** Add emails to same policy. No broad domain rules until IdP integrated (Google Workspace / Microsoft Entra).

**Removing staff:** Remove email from policy. Session continues until expiry (24h). For immediate revocation, use "Revoke existing tokens" button in Access App 1.

## Incident Response

**Unauthorized access suspected:**
1. Revoke sessions: Access → Applications → ARSAVAYA PMS → Revoke existing tokens
2. Rotate `BEDS24_READ_TOKEN` (wrangler secret put overwrite)
3. Review Cloudflare Access logs (Zero Trust → Logs → Access)
4. Review Worker logs (Cloudflare dashboard → Workers → arsavaya-pms → Logs)

**Secret leaked:**
1. Rotate immediately: `npx wrangler secret put <NAME> --config wrangler.prod.jsonc`
2. No redeploy needed — new version auto-deploys
3. Audit access logs for unauthorized use