\# ARSAVAYA PMS — Deployment Runbook



\*\*Status:\*\* PR-C is configuration-only. \*\*No production deploy performed.\*\*



\---



\## Production Target



| Item | Value |

|---|---|

| Hostname | `pms.arsavaya.com` |

| Worker name | `arsavaya-pms` |

| Runtime | Cloudflare Workers (standalone) |

| D1 binding | `DB` |

| D1 database name | `arsavaya-pms-prod` (created in PR-D) |

| Environment var | `ENVIRONMENT=production` |

| Auth | Cloudflare Access (configured in PR-E) |



\*\*Marketing site `arsavaya.com`\*\* is NOT deployed from this repo. DNS unchanged.



\---



\## Preflight



```powershell

npm run deploy:preflight

---

## PR-D — Production D1

### Database

| Item | Value |
|---|---|
| Name | `arsavaya-pms-prod` |
| Binding | `DB` |
| Placement | Cloudflare automatic |
| Config | `wrangler.prod.jsonc` → `d1_databases[0]` |

### Migrations

Migrations tracked by Wrangler via `d1_migrations` table.

```powershell
# List
npx wrangler d1 migrations list arsavaya-pms-prod --remote --config wrangler.prod.jsonc

# Apply
npx wrangler d1 migrations apply arsavaya-pms-prod --remote --config wrangler.prod.jsonc

---

## PR-E — Production Secrets + Cloudflare Access

### Zero Trust

| Item | Value |
|---|---|
| Plan | Free |
| Team name | `arsavaya` |
| Team domain | `arsavaya.cloudflareaccess.com` |
| IdP (initial) | Cloudflare Identity Provider |
| IdP (optional future) | One-time PIN |

### Access Applications

**App 1 — ARSAVAYA PMS (main protected)**

| Field | Value |
|---|---|
| Hostname | `pms.arsavaya.com` |
| Path | `/*` |
| Policy | Allow — `Allow initial admin` — Emails: `<admin email>` |
| Session | 24 hours |
| AUD Tag | `1618022799cce2eee850b87cce` |

**App 2 — ARSAVAYA iCal Feed (public/token-authenticated)**

| Field | Value |
|---|---|
| Hostname | `pms.arsavaya.com` |
| Path | `/api/calendar/*` |
| Policy | Bypass — `Bypass iCal feed` — Everyone |

### Route Invariant (CRITICAL)

| Route | Access Treatment | Auth Method |
|---|---|---|
| `/` | Protected by App 1 | Cloudflare Access JWT |
| `/api/pms` | Protected by App 1 | Cloudflare Access JWT |
| `/api/integrations/beds24` | Protected by App 1 | Cloudflare Access JWT |
| `/api/calendar` | Protected by App 1 | Cloudflare Access JWT |
| **`/api/calendar/<64-hex-token>`** | **Bypass by App 2** | **Token validation in app (pms_feed_keys)** |

**⚠️ HARD RULE:** Jangan pernah menempatkan endpoint staff/operator di bawah `/api/calendar/<child-path>`. Namespace itu di-reserve untuk public token feed. Endpoint authenticated HARUS di path lain (mis. `/api/integrations/*`).

### Required Production Secrets (NAMES only)

| Secret Name | Set at Phase | Source |
|---|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | PR-G | `arsavaya.cloudflareaccess.com` |
| `CF_ACCESS_APP_AUD` | PR-G | `1618022799cce2eee850b87cce` (App 1 AUD) |
| `BEDS24_READ_TOKEN` | PR-G | Production read-only token from Beds24 control panel |

**Injection command (deferred to PR-G):**

```powershell
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --config wrangler.prod.jsonc
npx wrangler secret put CF_ACCESS_APP_AUD --config wrangler.prod.jsonc
npx wrangler secret put BEDS24_READ_TOKEN --config wrangler.prod.jsonc


---

## PR-F — Observability + Release + Rollback

### Observability Stack (Cloudflare-native)

| Layer | Retention |
|---|---|
| Workers Metrics | up to 3 months |
| Workers Logs (Free) | 3 days, 200k events/day |
| Access Logs (Free) | 24 hours |
| D1 sync_runs / integration_events | Application-retained |

**Logpush:** SKIP — requires Workers Paid.

### Alerting

Deferred to PR-G — after `pms.arsavaya.com` active + real traffic.

### Config Hardening

`wrangler.prod.jsonc` sekarang include:
```jsonc
"workers_dev": false,
"preview_urls": false