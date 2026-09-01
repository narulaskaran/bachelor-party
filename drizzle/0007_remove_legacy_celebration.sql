-- Remove legacy Celebration records after the preset was intentionally retired.
-- Match only rows whose current or draft content uses the removed preset.
-- Keep the cleanup in one PostgreSQL statement: the production migrator uses
-- Neon HTTP, which accepts one statement per migration chunk.
DO $$
DECLARE
  legacy_party_ids integer[];
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::integer[])
    INTO legacy_party_ids
    FROM parties
   WHERE content ->> 'preset' = 'celebration'
      OR draft_content ->> 'preset' = 'celebration';

  IF cardinality(legacy_party_ids) > 0 THEN
    -- content_versions is append-only during normal application operation.
    -- This one-time record deletion must temporarily bypass its delete guard.
    EXECUTE 'ALTER TABLE content_versions DISABLE TRIGGER content_versions_no_delete';
    DELETE FROM content_versions WHERE party_id = ANY(legacy_party_ids);
    EXECUTE 'ALTER TABLE content_versions ENABLE TRIGGER content_versions_no_delete';

    DELETE FROM guests WHERE party_id = ANY(legacy_party_ids);
    DELETE FROM parties WHERE id = ANY(legacy_party_ids);
  END IF;
END
$$;
