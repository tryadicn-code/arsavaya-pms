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