-- Laevo — initial schema.
--
-- Multi-tenant from row one: orgs own users, and every other table carries an
-- org_id. There is no query in this codebase without a tenant scope.
--
-- One gentle contacts table rather than a table per relationship, because the
-- same person is very often a neighbor and a volunteer, and sometimes a donor
-- too. Roles stack in a comma list.

CREATE TABLE orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  plan TEXT NOT NULL DEFAULT 'community',
  -- What the pantry decided about itself. Laevo never enforces these; they are
  -- notes so a volunteer at the window knows what this pantry does.
  service_area_note TEXT,
  distribution_model TEXT NOT NULL DEFAULT 'choice',
  visit_note TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'volunteer' CHECK (role IN ('admin','staff','volunteer')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  -- Remembered across devices, because someone who needs big text needs it
  -- on every device they touch.
  large_text INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_org ON users(org_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'volunteer',
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT REFERENCES users(id),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_invites_org ON invites(org_id);

CREATE TABLE password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  address TEXT,
  hours_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sites_org ON sites(org_id);

-- The contacts spine. roles is a comma list: neighbor, volunteer, donor.
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  roles TEXT NOT NULL DEFAULT 'neighbor',
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  dob TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  household_size INTEGER,
  adults INTEGER,
  children INTEGER,
  seniors INTEGER,
  -- What this household cannot eat or cannot cook. Shown at the window while
  -- packing, not buried in a report nobody reads until it is too late.
  needs TEXT,
  notes TEXT,
  -- A short code a neighbor can carry on a card so returning is a lookup.
  card_code TEXT,
  unsub_token TEXT,
  first_visit_at TEXT,
  last_visit_at TEXT,
  visit_count INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Keyset pagination runs on (last_name, id); never OFFSET.
CREATE INDEX idx_contacts_org_name ON contacts(org_id, last_name, id);
CREATE INDEX idx_contacts_org_phone ON contacts(org_id, phone);
CREATE UNIQUE INDEX idx_contacts_card ON contacts(org_id, card_code);
CREATE INDEX idx_contacts_org_last_visit ON contacts(org_id, last_visit_at);

CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  site_id TEXT REFERENCES sites(id),
  visited_at TEXT NOT NULL DEFAULT (datetime('now')),
  household_size INTEGER,
  adults INTEGER,
  children INTEGER,
  seniors INTEGER,
  first_visit INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'walk_in',
  note TEXT,
  recorded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_visits_org_time ON visits(org_id, visited_at);
CREATE INDEX idx_visits_contact ON visits(contact_id, visited_at);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  unit TEXT NOT NULL DEFAULT 'cans',
  min_par REAL NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_items_org ON items(org_id, name);

CREATE TABLE lots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  site_id TEXT REFERENCES sites(id),
  quantity REAL NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  source_contact_id TEXT REFERENCES contacts(id),
  source_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_lots_org_item ON lots(org_id, item_id);
CREATE INDEX idx_lots_org_expiry ON lots(org_id, expires_at);

CREATE TABLE handouts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  visit_id TEXT NOT NULL REFERENCES visits(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  quantity REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_handouts_visit ON handouts(visit_id);

CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  site_id TEXT REFERENCES sites(id),
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  slots INTEGER NOT NULL DEFAULT 4,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_shifts_org_time ON shifts(org_id, starts_at);

CREATE TABLE signups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  shift_id TEXT NOT NULL REFERENCES shifts(id),
  contact_id TEXT REFERENCES contacts(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'coming' CHECK (status IN ('coming','came','no_show','cancelled')),
  reminded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_signups_shift ON signups(shift_id);
CREATE INDEX idx_signups_org ON signups(org_id);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  program TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_reports_org ON reports(org_id, created_at);

CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  source TEXT NOT NULL DEFAULT 'csv',
  status TEXT NOT NULL DEFAULT 'mapping',
  file_name TEXT,
  mapping_json TEXT,
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX idx_imports_org ON import_jobs(org_id, created_at);

CREATE TABLE email_log (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  kind TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_email_log_org ON email_log(org_id, created_at);

CREATE TABLE email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A plain activity trail. Every contact's page shows their whole history with
-- the pantry, and every AI-free automated action is written here too.
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  kind TEXT NOT NULL,
  subject_id TEXT,
  summary TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_events_org_time ON events(org_id, created_at);
CREATE INDEX idx_events_subject ON events(subject_id, created_at);

-- Messages from the public contact form, kept so nothing is lost if mail is
-- not configured yet.
CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  org_name TEXT,
  message TEXT NOT NULL,
  spam_score INTEGER NOT NULL DEFAULT 0,
  spam_reasons TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Housekeeping bookkeeping, so a re-run of anything scheduled is idempotent.
CREATE TABLE system_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
