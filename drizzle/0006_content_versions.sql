-- P2-3 content_versions audit trail: immutable full-snapshot history.
CREATE TABLE "content_versions" (
  "id" serial PRIMARY KEY NOT NULL,
  "party_id" integer NOT NULL,
  "version" integer NOT NULL,
  "state" text NOT NULL,
  "content_snapshot" jsonb NOT NULL,
  "base_version" integer,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "change_summary" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "published_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_versions_party_version_idx" ON "content_versions" USING btree ("party_id","version");--> statement-breakpoint
-- Immutability: reject any UPDATE or DELETE on audit rows at the database
-- level. Application code only ever INSERTs; this trigger guarantees it even
-- if a future code path (or raw SQL through the app's role) tries otherwise.
CREATE FUNCTION content_versions_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'content_versions is append-only: % rejected', TG_OP;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER content_versions_no_update BEFORE UPDATE ON "content_versions"
  FOR EACH ROW EXECUTE FUNCTION content_versions_immutable();--> statement-breakpoint
CREATE TRIGGER content_versions_no_delete BEFORE DELETE ON "content_versions"
  FOR EACH ROW EXECUTE FUNCTION content_versions_immutable();
