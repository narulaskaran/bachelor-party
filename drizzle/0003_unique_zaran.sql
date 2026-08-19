ALTER TABLE "parties" ADD COLUMN "draft_content" jsonb;--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "published" boolean DEFAULT true NOT NULL;