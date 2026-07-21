CREATE TYPE "public"."content_status" AS ENUM('active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('hint', 'fact');--> statement-breakpoint
CREATE TYPE "public"."vote_value" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cca3" text NOT NULL,
	"cca2" text NOT NULL,
	"name" text NOT NULL,
	"official_name" text NOT NULL,
	"flag_url" text NOT NULL,
	"flag_emoji" text NOT NULL,
	"capital" text,
	"population" bigint,
	"region" text,
	"subregion" text,
	"area" bigint,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"borders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cycle_index" integer NOT NULL,
	CONSTRAINT "countries_cca3_unique" UNIQUE("cca3"),
	CONSTRAINT "countries_cycle_index_unique" UNIQUE("cycle_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookie_id" text NOT NULL,
	"target_type" "target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fun_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"cycle_submitted" integer NOT NULL,
	"submitted_by" text NOT NULL,
	"text" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"cycle_submitted" integer NOT NULL,
	"submitted_by" text NOT NULL,
	"text" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookie_id" text NOT NULL,
	"country_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"guesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcome" "outcome",
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookie_id" text NOT NULL,
	"target_type" "target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"value" "vote_value" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fun_facts" ADD CONSTRAINT "fun_facts_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hints" ADD CONSTRAINT "hints_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_progress" ADD CONSTRAINT "player_progress_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "countries_cycle_index_idx" ON "countries" USING btree ("cycle_index");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "flags_unique_idx" ON "flags" USING btree ("cookie_id","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fun_facts_country_idx" ON "fun_facts" USING btree ("country_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fun_facts_one_per_player_idx" ON "fun_facts" USING btree ("submitted_by","country_id","cycle_submitted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hints_country_idx" ON "hints" USING btree ("country_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hints_one_per_player_idx" ON "hints" USING btree ("submitted_by","country_id","cycle_submitted");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "player_progress_unique_idx" ON "player_progress" USING btree ("cookie_id","country_id","cycle_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_progress_cookie_idx" ON "player_progress" USING btree ("cookie_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "votes_unique_idx" ON "votes" USING btree ("cookie_id","target_id");