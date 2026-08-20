ALTER TABLE "parties" ADD COLUMN "guest_token" text;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_guest_token_unique" UNIQUE("guest_token");
