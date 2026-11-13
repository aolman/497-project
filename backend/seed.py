"""Load Maya's demo data (the worked example from the design doc).

Run:  python seed.py
Dates are relative to today, so Home shows $187.80 / "About $170 - $190" whenever you run it.
The app's Settings screen can also reload this data (POST /reset with mode "demo").
"""
from datetime import date, timedelta

import db
from engine import week_start


def load_demo(conn) -> date:
    """Replace everything in the database with Maya's demo week. Returns this week's Monday."""
    db.wipe(conn)
    this_mon = week_start(date.today())
    conn.execute("UPDATE settings SET tax_rate = 0.20, cushion_level = 'strong', name = 'Maya', onboarded = 1 "
                 "WHERE id = 1")
    ids = {}
    for name in ("DoorDash", "Uber Eats", "Freelance"):
        ids[name] = conn.execute("INSERT INTO income_sources (name) VALUES (?)", (name,)).lastrowid

    # This week: $412 total
    this_week = [("DoorDash", 9400, 0, "Lunch rush"), ("Uber Eats", 11800, 1, None),
                 ("Freelance", 20000, 0, "Logo project")]
    # Last 8 weeks: fairly steady except one slow week
    past = {1: 40000, 2: 42000, 3: 39000, 4: 41000, 5: 22000, 6: 43000, 7: 40500, 8: 38000}
    for src, amt, day, note in this_week:
        conn.execute("INSERT INTO income_entries (source_id, amount_cents, date_earned, note) VALUES (?,?,?,?)",
                     (ids[src], amt, (this_mon + timedelta(days=day)).isoformat(), note))
    for k, amt in past.items():
        start = this_mon - timedelta(weeks=k)
        conn.execute("INSERT INTO income_entries (source_id, amount_cents, date_earned) VALUES (?,?,?)",
                     (ids["DoorDash"], amt - 12000, (start + timedelta(days=2)).isoformat()))
        conn.execute("INSERT INTO income_entries (source_id, amount_cents, date_earned) VALUES (?,?,?)",
                     (ids["Uber Eats"], 12000, (start + timedelta(days=5)).isoformat()))

    bills = [
        ("Mint Mobile", 4500, this_mon + timedelta(days=4), "monthly", 4500),
        ("Apartment rent", 85000, this_mon + timedelta(weeks=4), "monthly", 53000),
        ("Car insurance", 9500, this_mon + timedelta(weeks=2, days=1), "monthly", 9500),
        ("Internet", 6000, this_mon + timedelta(weeks=3, days=2), "monthly", 6000),
    ]
    for name, amt, due, repeat, reserved in bills:
        conn.execute("INSERT INTO bills (name, amount_cents, due_date, repeat, reserved_cents) VALUES (?,?,?,?,?)",
                     (name, amt, due.isoformat(), repeat, reserved))
    return this_mon


if __name__ == "__main__":
    db.init()
    with db.connect() as conn:
        monday = load_demo(conn)
    print(f"Seeded {db.DB_PATH} for the week of {monday}.")
