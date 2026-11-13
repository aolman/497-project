"""SQLite storage for Steady. One file, no server, free."""
import os
import sqlite3
from datetime import date

DB_PATH = os.environ.get("STEADY_DB", "steady.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    tax_rate        REAL    NOT NULL DEFAULT 0.20,
    cushion_level   TEXT    NOT NULL DEFAULT 'moderate'
                    CHECK (cushion_level IN ('light', 'moderate', 'strong')),
    week_start_day  INTEGER NOT NULL DEFAULT 0          -- 0 = Monday
);
CREATE TABLE IF NOT EXISTS income_sources (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS income_entries (
    id            INTEGER PRIMARY KEY,
    source_id     INTEGER NOT NULL REFERENCES income_sources(id),
    amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
    date_earned   TEXT    NOT NULL,
    note          TEXT
);
CREATE TABLE IF NOT EXISTS expenses (
    id            INTEGER PRIMARY KEY,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
    date          TEXT    NOT NULL,
    category      TEXT    NOT NULL,
    note          TEXT
);
CREATE TABLE IF NOT EXISTS bills (
    id              INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL,
    amount_cents    INTEGER NOT NULL CHECK (amount_cents > 0),
    due_date        TEXT    NOT NULL,
    repeat          TEXT    NOT NULL DEFAULT 'none' CHECK (repeat IN ('none', 'weekly', 'monthly')),
    reserved_cents  INTEGER NOT NULL DEFAULT 0,
    paid            INTEGER NOT NULL DEFAULT 0
);
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# Columns added after the first version; added to older databases on start-up.
MIGRATIONS = [
    ("settings", "name", "TEXT NOT NULL DEFAULT ''"),
    ("settings", "onboarded", "INTEGER NOT NULL DEFAULT 0"),
]


def init() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        conn.execute("INSERT OR IGNORE INTO settings (id) VALUES (1)")
        for table, column, decl in MIGRATIONS:
            have = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
            if column not in have:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def wipe(conn: sqlite3.Connection) -> None:
    """Delete every row and return settings to defaults (keeps the file and schema)."""
    for table in ("income_entries", "expenses", "bills", "income_sources"):
        conn.execute(f"DELETE FROM {table}")
    conn.execute("UPDATE settings SET tax_rate = 0.20, cushion_level = 'moderate', name = '', onboarded = 0 "
                 "WHERE id = 1")


def to_date(s: str) -> date:
    return date.fromisoformat(s)
