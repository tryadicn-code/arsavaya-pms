# ARSAVAYA PMS — Release Runbook

## Pre-Deploy Checklist

Otomatis via `deploy:prod`:
1. ✅ Working tree clean
2. ✅ Branch = Production-Readiness atau main
3. ✅ Build output exists
4. ✅ Config parseable
5. ✅ workers_dev === false
6. ✅ preview_urls === false
7. ✅ ENVIRONMENT=production
8. ✅ D1 binding resolved
9. ✅ Required secrets present

Manual:
10. Regression tests PASS
11. `tsc --noEmit` = 0 errors
12. `npm run build` complete
13. Backup D1 (kalau schema change)
14. Catat commit hash (untuk rollback reference)

## Deploy Command

```powershell
npm run deploy:prod -- --deploy