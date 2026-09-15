# ARSAVAYA Connectivity Layer

**Phase 1 - Foundation only.** No live provider implemented yet.

## Architecture

ARSAVAYA PMS Core (lib/pms.ts, lib/channels.ts, app/api/*)
        |
   Connectivity Layer (lib/integrations/*)
        |
   ChannelManagerAdapter (contract)
        |
   Provider Adapter (Beds24 / Smoobu - Phase 2+)
        |
   Existing Channel Manager
        |
       OTA

## Status of legacy channel code

| Item | Verdict | Notes |
|---|---|---|
| lib/channels.ts iCal flow | KEEP | Fallback connectivity only |
| simulateChannels | KEEP (DEMO) | Explicitly labeled; never production |
| Connection.mode: 'api' | DEPRECATE | Was mapping-only; superseded by provider registry |
| app/api/calendar/* | KEEP | iCal-only namespace |
| pms_workspace.data | KEEP | Core operational storage - untouched |

## Reserved API namespaces

| Namespace | Purpose |
|---|---|
| /api/calendar/* | iCal feeds only |
| /api/integrations/* | Authenticated provider management (reserved) |
| /api/webhooks/* | External provider ingress (reserved for Phase 2+) |

## Phase 1 scope

- Provider registry
- Capability model
- Canonical models
- Adapter contract
- Additive D1 tables (accounts, unit mappings, integration events, sync runs)
- Provider-neutral reconciliation
- Idempotency via dedupe_key UNIQUE
- Sync health model
- Sync run + opaque cursor/watermark

**Out of scope:** Beds24 / Smoobu adapters, live webhooks, rate/availability write-back.