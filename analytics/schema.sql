
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS analytics_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS visits (
 visit_id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
 consent_version TEXT NOT NULL, ip TEXT, country TEXT, region TEXT, city TEXT, network_asn INTEGER,
 user_agent TEXT, browser TEXT, os TEXT, device TEXT, language TEXT, timezone TEXT, referrer_origin TEXT,
 screen_width INTEGER, screen_height INTEGER, viewport_width INTEGER, viewport_height INTEGER,
 active_ms INTEGER NOT NULL DEFAULT 0, visible_ms INTEGER NOT NULL DEFAULT 0, elapsed_ms INTEGER NOT NULL DEFAULT 0,
 max_scroll INTEGER NOT NULL DEFAULT 0, performance_json TEXT NOT NULL DEFAULT '{}', is_test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS visits_first_seen ON visits(first_seen);
CREATE INDEX IF NOT EXISTS visits_visitor_id ON visits(visitor_id);
CREATE TABLE IF NOT EXISTS events (
 event_id TEXT PRIMARY KEY, visit_id TEXT NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
 received_at TEXT NOT NULL, client_at TEXT, kind TEXT NOT NULL, page_path TEXT NOT NULL, section TEXT, target TEXT,
 elapsed_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS events_visit ON events(visit_id);
CREATE INDEX IF NOT EXISTS events_received ON events(received_at);
CREATE INDEX IF NOT EXISTS events_kind ON events(kind);
INSERT OR REPLACE INTO analytics_config VALUES ('schema_version','1');
INSERT OR REPLACE INTO analytics_config VALUES ('site','https://amirrgb.github.io');
INSERT OR REPLACE INTO analytics_config VALUES ('retention','No automatic expiry; retained until owner deletion or visitor deletion request');
INSERT OR REPLACE INTO analytics_config VALUES ('consent_version','2026-10-30.v1');

CREATE TABLE IF NOT EXISTS page_counts (day TEXT PRIMARY KEY, page_views INTEGER NOT NULL DEFAULT 0);
INSERT OR REPLACE INTO analytics_config VALUES ('anonymous_mode','Default daily page-view totals only; no individual records, IP, visitor ID, referrer, device or location are stored in page_counts. Reject/GPC/DNT skip optional counting.');
