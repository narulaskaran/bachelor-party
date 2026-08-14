ALTER TABLE "guests" ADD COLUMN "guest_token" text;--> statement-breakpoint
UPDATE "guests" SET "guest_token" = replace(gen_random_uuid()::text, '-', '') WHERE "guest_token" IS NULL;--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "guest_token" SET NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "guests_party_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "guests_party_guest_token_idx" ON "guests" USING btree ("party_id","guest_token");
