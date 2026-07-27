-- Closing the gap between what the marketing site promises and what the
-- product does.
--
--  * The Network plan sells "as many locations as you run", so locations need
--    to be manageable and archivable rather than a single row created at
--    signup.
--  * The home page says volunteer hours are logged, because in-kind hours are
--    real match money on a grant application. Nothing logged them.
--  * The copy says Laevo puts two possible duplicates side by side and asks a
--    person, which implies the person can then act. There was no merge.

-- Locations can be retired without deleting the visits recorded against them.
ALTER TABLE sites ADD COLUMN archived_at TEXT;

-- Where a household ended up when two records turned out to be one family.
-- The losing record is kept, emptied and pointed here, so past report totals
-- stay correct and nothing silently disappears from a filed quarter.
ALTER TABLE contacts ADD COLUMN merged_into TEXT REFERENCES contacts(id);
CREATE INDEX idx_contacts_merged ON contacts(merged_into);

-- Hours a volunteer actually gave, recorded against the shift they came to.
ALTER TABLE signups ADD COLUMN hours REAL;

-- A tokenised, revocable calendar feed so volunteers can subscribe to the
-- rota in whatever calendar they already use.
ALTER TABLE orgs ADD COLUMN calendar_token TEXT;
CREATE INDEX idx_orgs_calendar_token ON orgs(calendar_token);
