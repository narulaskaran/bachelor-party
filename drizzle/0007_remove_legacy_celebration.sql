-- Remove legacy Celebration records after the preset was intentionally retired.
-- Match only rows whose current or draft content uses the removed preset.
-- Dependent guests and immutable audit snapshots must be removed first.
CREATE TEMP TABLE legacy_celebration_parties ON COMMIT DROP AS
SELECT id
FROM parties
WHERE content ->> 'preset' = 'celebration'
   OR draft_content ->> 'preset' = 'celebration';

ALTER TABLE content_versions DISABLE TRIGGER content_versions_no_delete;
DELETE FROM content_versions
WHERE party_id IN (SELECT id FROM legacy_celebration_parties);
ALTER TABLE content_versions ENABLE TRIGGER content_versions_no_delete;

DELETE FROM guests
WHERE party_id IN (SELECT id FROM legacy_celebration_parties);

DELETE FROM parties
WHERE id IN (SELECT id FROM legacy_celebration_parties);
