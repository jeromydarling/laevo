-- Where food comes from becomes a record you can manage.
--
-- Until now a delivery's source was free text typed on the form, so the
-- annual "who gave us what" page could count them but nobody could correct a
-- typo, merge "Heinens" and "Heinen's", or retire a shop that closed. A
-- pantry noticing a misspelling in November had no way to fix it.
--
-- Sources live in the contacts table with the donor role rather than a table
-- of their own, because the same grocery manager is often already a neighbor
-- or a volunteer, and one gentle contacts table is the whole point of the
-- spine. Organisations are stored with the name in last_name and first_name
-- empty, so ordinary name sorting and display still work.

-- Every distinct source anybody has typed becomes a donor contact.
INSERT INTO contacts (id, org_id, roles, first_name, last_name, created_at)
SELECT
  'don_' || lower(hex(randomblob(10))),
  org_id,
  'donor',
  '',
  name,
  datetime('now')
FROM (
  SELECT DISTINCT org_id, TRIM(source_note) AS name
  FROM lots
  WHERE source_note IS NOT NULL AND TRIM(source_note) <> ''
);

-- Point the existing deliveries at them, so no history is lost in the move.
UPDATE lots
   SET source_contact_id = (
     SELECT c.id FROM contacts c
      WHERE c.org_id = lots.org_id
        AND c.roles LIKE '%donor%'
        AND lower(c.last_name) = lower(TRIM(lots.source_note))
      LIMIT 1
   )
 WHERE source_note IS NOT NULL AND TRIM(source_note) <> '';

CREATE INDEX idx_lots_source_contact ON lots(source_contact_id);
CREATE INDEX idx_contacts_org_roles ON contacts(org_id, roles);
