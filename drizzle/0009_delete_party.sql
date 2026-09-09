-- Party delete must remove versions + guests in one statement so a failed
-- party-row delete never leaves RSVPs wiped. Neon HTTP has no multi-statement
-- transactions from the app, so the cascade lives in this function.
-- content_versions DELETE is allowed only while party.delete_party is on
-- (transaction-local GUC). UPDATE stays rejected. Draft prune (0008) is unchanged.
CREATE OR REPLACE FUNCTION content_versions_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('party.delete_party', true) = 'on' THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'DELETE'
     AND current_setting('party.prune_content_versions', true) = 'on'
     AND OLD.state = 'draft' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'content_versions is append-only: % rejected', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION delete_party(p_party_id integer)
RETURNS integer AS $$
DECLARE
  removed integer;
BEGIN
  PERFORM set_config('party.delete_party', 'on', true);
  DELETE FROM content_versions WHERE party_id = p_party_id;
  DELETE FROM guests WHERE party_id = p_party_id;
  DELETE FROM parties WHERE id = p_party_id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$ LANGUAGE plpgsql;
