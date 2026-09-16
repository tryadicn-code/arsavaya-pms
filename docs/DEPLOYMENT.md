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

