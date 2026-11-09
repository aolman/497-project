"""Reset steady.db and load Maya's demo data (the worked example from the design doc).

Run:  python seed.py
Dates are relative to today, so Home shows $187.80 / "About $170 - $190" whenever you run it.
"""
import os
from datetime import date, timedelta

import db
from engine import week_start

if os.path.exists(db.DB_PATH):
    os.remove(db.DB_PATH)
db.init()

this_mon = week_start(date.today())

with db.connect() as conn:
    conn.execute("UPDATE settings SET tax_rate = 0.20, cushion_level = 'strong' WHERE id = 1")
    for name in ("DoorDash", "Uber Eats", "Freelance"):
        conn.execute("INSERT INTO income_sources (name) VALUES (?)", (name,))

    # This week: $412 total (Mon DoorDash $94, Tue Uber Eats $118, Mon Freelance $200)
    this_week = [(1, 9400, 0), (2, 11800, 1), (3, 20000, 0)]
    # Last 8 weeks, fairly steady except one slow week
    past = {1: 40000, 2: 42000, 3: 39000, 4: 41000, 5: 22000, 6: 43000, 7: 40500, 8: 38000}
    for src, amt, day in this_week:
        conn.execute("INSERT INTO income_entries (source_id, amount_cents, date_earned) VALUES (?,?,?)",
                     (src, amt, (this_mon + timedelta(days=day)).isoformat()))
    for k, amt in past.items():
        conn.execute("INSERT INTO income_entries (source_id, amount_cents, date_earned) VALUES (1,?,?)",
                     (amt, (this_mon - timedelta(weeks=k) + timedelta(days=2)).isoformat()))

    conn.execute("INSERT INTO bills (name, amount_cents, due_date, repeat, reserved_cents) VALUES (?,?,?,?,?)",
                 ("Phone", 4500, (this_mon + timedelta(days=4)).isoformat(), "monthly", 4500))
    conn.execute("INSERT INTO bills (name, amount_cents, due_date, repeat, reserved_cents) VALUES (?,?,?,?,?)",
                 ("Rent", 85000, (this_mon + timedelta(weeks=4)).isoformat(), "monthly", 53000))

print(f"Seeded {db.DB_PATH} for the week of {this_mon}.")
