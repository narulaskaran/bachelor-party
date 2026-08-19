ALTER TABLE "guests" ADD COLUMN "attendance_status" text DEFAULT 'attending' NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "party_size" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "plus_one_name" text;