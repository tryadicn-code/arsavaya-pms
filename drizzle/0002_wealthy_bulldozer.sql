CREATE TABLE `channel_manager_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`external_account_id` text,
	`credential_source` text NOT NULL,
	`config_json` text,
	`last_sync_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_manager_accounts_workspace_provider_unique` ON `channel_manager_accounts` (`workspace`,`provider`);--> statement-breakpoint
CREATE INDEX `channel_manager_accounts_workspace_idx` ON `channel_manager_accounts` (`workspace`);--> statement-breakpoint
CREATE TABLE `channel_manager_unit_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`workspace` text NOT NULL,
	`local_unit_id` text NOT NULL,
	`external_property_id` text NOT NULL,
	`external_unit_id` text NOT NULL,
	`confirmed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_manager_unit_mappings_account_local_unique` ON `channel_manager_unit_mappings` (`account_id`,`local_unit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `channel_manager_unit_mappings_account_external_unique` ON `channel_manager_unit_mappings` (`account_id`,`external_property_id`,`external_unit_id`);--> statement-breakpoint
CREATE INDEX `channel_manager_unit_mappings_workspace_idx` ON `channel_manager_unit_mappings` (`workspace`);--> statement-breakpoint
CREATE TABLE `integration_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`account_id` text NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`external_id` text NOT NULL,
	`entity_key` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`external_updated_at` text,
	`local_entity_id` text,
	`reconciliation_status` text NOT NULL,
	`metadata` text,
	`error` text,
	`received_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_events_dedupe_key_unique` ON `integration_events` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `integration_events_entity_key_idx` ON `integration_events` (`provider`,`account_id`,`entity_key`);--> statement-breakpoint
CREATE INDEX `integration_events_external_idx` ON `integration_events` (`provider`,`account_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `integration_events_workspace_idx` ON `integration_events` (`workspace`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`account_id` text NOT NULL,
	`provider` text NOT NULL,
	`sync_type` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`cursor_before` text,
	`cursor_after` text,
	`received_count` integer DEFAULT 0 NOT NULL,
	`created_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`cancelled_count` integer DEFAULT 0 NOT NULL,
	`conflict_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `sync_runs_account_idx` ON `sync_runs` (`account_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `sync_runs_workspace_idx` ON `sync_runs` (`workspace`);