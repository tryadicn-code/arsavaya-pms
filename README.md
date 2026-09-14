# Vila Eight PMS

A private, owner-operated property management application for eight villas. Indonesian interface, IDR currency and Asia/Makassar dates.

## Implemented

- Durable D1 data separated into live and demonstration workspaces per authenticated owner.
- Reservations, availability calendar, temporary holds, conflict detection and date/unit edits.
- Check-in/out; checkout creates housekeeping work.
- Manual payments, refunds and refundable security deposits, with amount validation.
- Unit names, capacity and base nightly rates.
- Housekeeping and maintenance task boards; date blocks for repairs or personal use.
- Guest history, expenses, monthly operating reports and JSON data export.
- Optimistic concurrency control on every write and an activity history.
- Private Sites authentication; unauthenticated API requests are rejected.

## Current boundaries

This is an initial operational implementation, not all advanced features in the blueprint. Live outbound OTA synchronization, online payments, external automatic messaging, staff role accounts, document uploads, inventory, seasonal pricing, tax line items, group/multi-unit reservations, formal invoices and automated backup/restore workflows are not implemented. Channel names record the source manually. The print action provides a reservation summary. Reports use total booking price allocated by night; occupancy includes blocked nights in its denominator. Financial entries are manual records, not money transfers.

The current D1 model stores a versioned workspace document with atomic compare-and-swap updates. It prevents simultaneous overwrites and double bookings; large multi-property workloads should migrate to normalized transaction tables. Retained audit history is limited to 1,000 actions. User exports provide a downloadable copy but are not automated backups.

## Development

Install dependencies with the pinned lockfile, then run `npm run dev`. The Sites portable development server provides loopback-only mock sign-in at `/signin-with-chatgpt?return_to=/`. Production auth is owned by the Sites platform.

Generate schema migrations with `npm run db:generate`, build, then apply pending SQL locally using the Wrangler instructions in the Sites skill. Do not replay applied migrations.

## Verification

`node --experimental-strip-types tests/pms.test.mjs` tests booking collisions, adjacent stays, capacity/date validation, financial limits, housekeeping, blocking and hold expiry. Type checking uses `tsc --noEmit`. Local API verification additionally covers authentication, persistent writes, concurrent 200/409 responses and demo/live separation.

## Automation and OTA calendar modules

The Automatisasi menu supports payment reminders, arrival-preparation tasks, checkout-message drafts, checkout housekeeping, expired holds, recurring maintenance schedules, enable/pause controls, and execution history. It runs after writes and once per minute while the app is open and active; catch-up runs at open. This is not a 24/7 scheduler and it sends no messages externally. Reminder drafts can be copied manually. Only interface preferences (selected view and demo/live mode) use browser storage; property data stays in D1.

The Sinkronisasi OTA menu supports multiple listings per physical unit, calendar import from verified official HTTPS Airbnb/Booking.com/Vrbo domains, mapping-only records for Agoda/Traveloka/other API channels, incoming blocks, import history, URL correction, pause/resume, and destination-specific iCal export. Incoming blocks prevent conflicting PMS reservations. The calendar parser accepts non-recurring all-day VEVENTs with stable UIDs. Unsupported or failed feeds preserve prior blocks. Events missing from a successful complete feed are released; providers must supply an authoritative calendar. Source-specific export excludes the origin and uses recognizable UIDs to reduce echoes. Providers that rewrite UIDs and strip markers require additional loop handling.

Incoming polls become eligible every five minutes, with up to four due calendars processed per active check. No scheduler runs when the app is closed. Outbound bearer calendar handlers export only availability, not guest or payment data; registry keys are hashed. The private Sites gateway currently prevents OTA access. Therefore outgoing connections are explicitly marked pending, and downloading an ICS file is only a snapshot. Do not claim live multi-OTA synchronization until an appropriate externally reachable calendar endpoint or approved channel-manager adapter has been activated and verified. No OTA credentials or real calendar URLs have been supplied or connected.

Demo-only simulation demonstrates Airbnb reservations, date changes and cancellations flowing into destination calendars for Booking.com, Agoda and Traveloka without external side effects. `tests/automation-channels.test.mjs` verifies deduplication, reminder resolution, recurring catch-up, A-to-B/C/D exports, origin exclusion, collision prevention, updates, cancellations, malformed calendars and URL validation. Additional local API tests verified hashed feed registration, 404 on unknown tokens, demo-only guards and authenticated data persistence.

Live outbound synchronization and provider API adapters remain unconfigured.

