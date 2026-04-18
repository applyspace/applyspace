CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`offer_id` text,
	`profile_id` text NOT NULL,
	`company_id` text NOT NULL,
	`job_title` text NOT NULL,
	`applied_at` text NOT NULL,
	`status` text NOT NULL,
	`cover_letter` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "applications_status_check" CHECK(status IN ('waiting', 'interviewing', 'accepted', 'rejected', 'ghosted', 'withdrawn'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_applications_offer` ON `applications` (`offer_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_profile` ON `applications` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_company` ON `applications` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_status` ON `applications` (`status`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text,
	`linkedin_handle` text,
	`sector` text,
	`size` text,
	`headquarters` text,
	`description` text,
	`logo_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "companies_size_check" CHECK(size IS NULL OR size IN ('startup', 'scale-up', 'midsize', 'large'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_name_unique` ON `companies` (`name`);--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`company_id` text,
	`title` text NOT NULL,
	`location` text,
	`started_at` text NOT NULL,
	`ended_at` text,
	`is_current` integer DEFAULT false NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_experiences_profile` ON `experiences` (`profile_id`);--> statement-breakpoint
CREATE INDEX `idx_experiences_company` ON `experiences` (`company_id`);--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`stage` text NOT NULL,
	`scheduled_at` text,
	`completed_at` text,
	`outcome` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "interviews_stage_check" CHECK(stage IN ('HR', 'Manager', 'Design Case', 'Team-Fit', 'Technical', 'Final', 'Other')),
	CONSTRAINT "interviews_outcome_check" CHECK(outcome IS NULL OR outcome IN ('pending', 'passed', 'failed', 'ghosted'))
);
--> statement-breakpoint
CREATE INDEX `idx_interviews_application` ON `interviews` (`application_id`);--> statement-breakpoint
CREATE TABLE `no_gos` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`label_en` text NOT NULL,
	`label_fr` text NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `no_gos_key_unique` ON `no_gos` (`key`);--> statement-breakpoint
CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_slug` text NOT NULL,
	`company_id` text NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`remote_mode` text,
	`contract` text,
	`experience_level` text,
	`salary_min_eur` integer,
	`salary_max_eur` integer,
	`salary_raw` text,
	`description` text NOT NULL,
	`description_html` text,
	`posted_at` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`user_status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`platform_slug`) REFERENCES `platforms`(`slug`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "offers_remote_mode_check" CHECK(remote_mode IS NULL OR remote_mode IN ('onsite', 'hybrid', 'remote')),
	CONSTRAINT "offers_contract_check" CHECK(contract IS NULL OR contract IN ('CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage')),
	CONSTRAINT "offers_experience_level_check" CHECK(experience_level IS NULL OR experience_level IN ('entry', 'mid', 'senior', 'lead')),
	CONSTRAINT "offers_user_status_check" CHECK(user_status IN ('new', 'viewed', 'passed', 'applied'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_offers_platform_external` ON `offers` (`platform_slug`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_offers_platform_url` ON `offers` (`platform_slug`,`url`);--> statement-breakpoint
CREATE INDEX `idx_offers_company` ON `offers` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_offers_user_status` ON `offers` (`user_status`);--> statement-breakpoint
CREATE INDEX `idx_offers_last_seen` ON `offers` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `platform_connections` (
	`platform_slug` text PRIMARY KEY NOT NULL,
	`connected_at` text,
	`last_scraped_at` text,
	`cookie_blob` blob,
	`cookie_file_path` text,
	FOREIGN KEY (`platform_slug`) REFERENCES `platforms`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `platforms` (
	`slug` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`brand_color` text,
	`login_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`job_title` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_no_gos` (
	`search_id` text NOT NULL,
	`no_go_id` text NOT NULL,
	PRIMARY KEY(`search_id`, `no_go_id`),
	FOREIGN KEY (`search_id`) REFERENCES `searches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`no_go_id`) REFERENCES `no_gos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_search_no_gos_no_go` ON `search_no_gos` (`no_go_id`);--> statement-breakpoint
CREATE TABLE `searches` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`search_title` text NOT NULL,
	`location` text,
	`contract_types` text,
	`experience_levels` text,
	`remote_mode` text,
	`salary_min_eur` integer,
	`salary_max_eur` integer,
	`enabled_platforms` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "searches_remote_mode_check" CHECK(remote_mode IS NULL OR remote_mode IN ('onsite', 'hybrid', 'remote'))
);
--> statement-breakpoint
CREATE INDEX `idx_searches_profile` ON `searches` (`profile_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`first_name` text,
	`last_name` text,
	`avatar_url` text,
	`email` text,
	`linkedin_url` text,
	`default_profile_id` text,
	`locale` text DEFAULT 'fr' NOT NULL,
	`theme_mode` text DEFAULT 'system' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`default_profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "settings_locale_check" CHECK(locale IN ('en', 'fr')),
	CONSTRAINT "settings_theme_mode_check" CHECK(theme_mode IN ('light', 'dark', 'system'))
);
