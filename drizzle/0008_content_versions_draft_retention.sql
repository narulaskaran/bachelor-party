-- Cap retained draft snapshots. Published rows stay immortal.
-- DELETE of drafts is allowed only inside prune_draft_content_versions
-- (transaction-local GUC). UPDATE is still rejected. Neon HTTP runs each
-- statement separately, so the GUC is set inside the function, not SET LOCAL
-- from the app.
CREATE OR REPLACE FUNCTION content_versions_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('party.prune_content_versions', true) = 'on'
     AND OLD.state = 'draft' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'content_versions is append-only: % rejected', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prune_draft_content_versions(p_party_id integer, p_keep integer)
RETURNS integer AS $$
DECLARE
  deleted integer;
BEGIN
  PERFORM set_config('party.prune_content_versions', 'on', true);
  DELETE FROM content_versions
  WHERE party_id = p_party_id
    AND state = 'draft'
    AND id IN (
      SELECT id FROM (
        SELECT id, row_number() OVER (ORDER BY version DESC) AS rn
        FROM content_versions
        WHERE party_id = p_party_id AND state = 'draft'
      ) ranked
      WHERE rn > GREATEST(p_keep, 0)
    );
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- Backfill: drop surplus drafts on existing trips. Published rows stay.
DO $$
DECLARE
  party record;
BEGIN
  FOR party IN SELECT DISTINCT party_id FROM content_versions LOOP
    PERFORM prune_draft_content_versions(party.party_id, 20);
  END LOOP;
END
$$;
