ALTER TABLE "parties" ADD COLUMN "admin_token" text;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_admin_token_unique" UNIQUE("admin_token");