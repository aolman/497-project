"""Steady API. Run:  uvicorn main:app --reload   then open http://127.0.0.1:8000/docs"""
from __future__ import annotations

import calendar
import datetime as dt
from datetime import date, timedelta
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
import engine as eng

app = FastAPI(title="Steady API", description="Safe-to-spend backend for gig workers with irregular income.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
db.init()


def cents(dollars: float) -> int:
    return int(round(dollars * 100))


def dollars(c: int) -> float:
    return round(c / 100, 2)


# ---------- loaders: database rows -> engine objects ----------

def load_settings(conn) -> eng.Settings:
    r = conn.execute("SELECT tax_rate, cushion_level FROM settings WHERE id = 1").fetchone()
    return eng.Settings(r["tax_rate"], r["cushion_level"])


def load_income(conn) -> list[eng.Entry]:
    rows = conn.execute("SELECT e.amount_cents, e.date_earned, s.name FROM income_entries e "
                        "JOIN income_sources s ON s.id = e.source_id").fetchall()
    return [eng.Entry(r["amount_cents"], db.to_date(r["date_earned"]), r["name"]) for r in rows]


def load_expenses(conn) -> list[eng.Entry]:
    rows = conn.execute("SELECT amount_cents, date, category FROM expenses").fetchall()
    return [eng.Entry(r["amount_cents"], db.to_date(r["date"]), r["category"]) for r in rows]


def load_bills(conn) -> list[eng.Bill]:
    rows = conn.execute("SELECT * FROM bills").fetchall()
    return [eng.Bill(r["name"], r["amount_cents"], db.to_date(r["due_date"]), r["reserved_cents"], bool(r["paid"]))
            for r in rows]


def recent_weeks(income, today) -> list[int]:
    this = eng.week_start(today)
    return [eng.week_total(income, this - timedelta(weeks=k)) for k in range(1, 5)]


# ---------- request bodies ----------

class SettingsIn(BaseModel):
    tax_rate: float = Field(ge=0, le=0.5, examples=[0.20])
    cushion_level: Literal["light", "moderate", "strong"] = "moderate"


class SourceIn(BaseModel):
    name: str = Field(min_length=1, examples=["DoorDash"])


class IncomeIn(BaseModel):
    source_id: int = Field(examples=[1])
    amount: float = Field(gt=0, examples=[94.00])
    date_earned: date = Field(default_factory=date.today)
    note: Optional[str] = None


class ExpenseIn(BaseModel):
    amount: float = Field(gt=0, examples=[23.50])
    date: dt.date = Field(default_factory=dt.date.today)
    category: str = Field(examples=["groceries"])
    note: Optional[str] = None


class BillIn(BaseModel):
    name: str = Field(examples=["Rent"])
    amount: float = Field(gt=0, examples=[850.00])
    due_date: date
    repeat: Literal["none", "weekly", "monthly"] = "none"
    reserved: float = Field(default=0, ge=0)


# ---------- endpoints ----------

@app.get("/settings", tags=["Setup"])
def get_settings():
    with db.connect() as conn:
        s = load_settings(conn)
    return {"tax_rate": s.tax_rate, "cushion_level": s.cushion_level, "cushion_rate": s.cushion_rate}


@app.put("/settings", tags=["Setup"])
def put_settings(body: SettingsIn):
    with db.connect() as conn:
        conn.execute("UPDATE settings SET tax_rate = ?, cushion_level = ? WHERE id = 1",
                     (body.tax_rate, body.cushion_level))
    return get_settings()


@app.get("/sources", tags=["Setup"])
def list_sources():
    with db.connect() as conn:
        return [dict(r) for r in conn.execute("SELECT id, name FROM income_sources ORDER BY id")]


@app.post("/sources", tags=["Setup"], status_code=201)
def add_source(body: SourceIn):
    with db.connect() as conn:
        conn.execute("INSERT OR IGNORE INTO income_sources (name) VALUES (?)", (body.name.strip(),))
        row = conn.execute("SELECT id, name FROM income_sources WHERE name = ?", (body.name.strip(),)).fetchone()
    return dict(row)


@app.post("/income", tags=["Log"], status_code=201)
def log_income(body: IncomeIn):
    amt = cents(body.amount)
    with db.connect() as conn:
        if not conn.execute("SELECT 1 FROM income_sources WHERE id = ?", (body.source_id,)).fetchone():
            raise HTTPException(400, "Unknown income source. Add it with POST /sources first.")
        cur = conn.execute("INSERT INTO income_entries (source_id, amount_cents, date_earned, note) VALUES (?,?,?,?)",
                           (body.source_id, amt, body.date_earned.isoformat(), body.note))
        b = eng.entry_breakdown(amt, load_settings(conn))
    return {"id": cur.lastrowid, "breakdown": {k.removesuffix("_cents"): dollars(v) for k, v in b.items()}}


@app.get("/income", tags=["Activity"])
def income_for_week(week: Optional[date] = None):
    start = eng.week_start(week or date.today())
    end = start + timedelta(days=6)
    with db.connect() as conn:
        rows = conn.execute("SELECT e.id, s.name AS source, e.amount_cents, e.date_earned, e.note "
                            "FROM income_entries e JOIN income_sources s ON s.id = e.source_id "
                            "WHERE e.date_earned BETWEEN ? AND ? ORDER BY e.date_earned",
                            (start.isoformat(), end.isoformat())).fetchall()
    entries = [{**dict(r), "amount": dollars(r["amount_cents"])} for r in rows]
    return {"week_of": start.isoformat(), "entries": entries,
            "total": dollars(sum(r["amount_cents"] for r in rows))}


@app.post("/expenses", tags=["Log"], status_code=201)
def log_expense(body: ExpenseIn):
    try:
        eng.validate_category(body.category)
    except ValueError as e:
        raise HTTPException(400, str(e))
    with db.connect() as conn:
        cur = conn.execute("INSERT INTO expenses (amount_cents, date, category, note) VALUES (?,?,?,?)",
                           (cents(body.amount), body.date.isoformat(), body.category, body.note))
    return {"id": cur.lastrowid}


@app.get("/bills", tags=["Bills"])
def list_bills():
    with db.connect() as conn:
        rows = conn.execute("SELECT * FROM bills WHERE paid = 0 ORDER BY due_date").fetchall()
    return [{"id": r["id"], "name": r["name"], "amount": dollars(r["amount_cents"]), "due_date": r["due_date"],
             "repeat": r["repeat"], "reserved": dollars(r["reserved_cents"])} for r in rows]


@app.post("/bills", tags=["Bills"], status_code=201)
def add_bill(body: BillIn):
    with db.connect() as conn:
        cur = conn.execute("INSERT INTO bills (name, amount_cents, due_date, repeat, reserved_cents) VALUES (?,?,?,?,?)",
                           (body.name, cents(body.amount), body.due_date.isoformat(), body.repeat, cents(body.reserved)))
    return {"id": cur.lastrowid}


def add_month(d: date) -> date:
    y, m = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


@app.post("/bills/{bill_id}/pay", tags=["Bills"])
def pay_bill(bill_id: int):
    with db.connect() as conn:
        r = conn.execute("SELECT * FROM bills WHERE id = ?", (bill_id,)).fetchone()
        if not r:
            raise HTTPException(404, "Bill not found.")
        due = db.to_date(r["due_date"])
        if r["repeat"] == "none":
            conn.execute("UPDATE bills SET paid = 1 WHERE id = ?", (bill_id,))
            return {"id": bill_id, "status": "paid"}
        nxt = add_month(due) if r["repeat"] == "monthly" else due + timedelta(days=7)
        conn.execute("UPDATE bills SET due_date = ?, reserved_cents = 0 WHERE id = ?", (nxt.isoformat(), bill_id))
    return {"id": bill_id, "status": "paid", "next_due": nxt.isoformat()}


@app.get("/summary", tags=["Home"])
def summary(week: Optional[date] = None):
    """The safe-to-spend number on Home, with every line of the breakdown."""
    today = week or date.today()
    with db.connect() as conn:
        s, inc, exp, bills = load_settings(conn), load_income(conn), load_expenses(conn), load_bills(conn)
    r = eng.safe_to_spend(inc, exp, bills, s, today, recent_weeks(inc, today))
    return {
        "week_of": eng.week_start(today).isoformat(),
        "display": r.label(),
        "safe_to_spend_exact": dollars(r.exact_cents),
        "range": {"low": dollars(r.low_cents), "high": dollars(r.high_cents)},
        "short_by": dollars(r.short_by_cents),
        "income_swings": r.swings,
        "breakdown": {"income": dollars(r.income_cents), "tax_set_aside": dollars(r.tax_cents),
                      "cushion": dollars(r.cushion_cents), "bills_reserve": dollars(r.bills_cents),
                      "spent": dollars(r.spent_cents)},
        "bills": [{"bill": l["bill"], "weeks_left": l["weeks_left"], "missing": dollars(l["missing_cents"]),
                   "this_week": dollars(l["this_week_cents"])} for l in r.bill_lines],
    }


@app.get("/weeks", tags=["Activity"])
def weeks(n: int = 8):
    with db.connect() as conn:
        h = eng.weekly_history(load_income(conn), date.today(), n)
    return {"weeks": [{"week_of": w["week_of"], "total": dollars(w["total_cents"])} for w in h["weeks"]],
            "highest": dollars(h["highest_cents"]), "lowest": dollars(h["lowest_cents"]),
            "average": dollars(h["average_cents"])}


@app.get("/tax", tags=["Tax"])
def tax():
    with db.connect() as conn:
        t = eng.tax_reserve(load_income(conn), load_settings(conn), date.today())
    return {(k.removesuffix("_cents")): (dollars(v) if k.endswith("_cents") else v) for k, v in t.items()}


@app.get("/plan", tags=["Planner"])
def plan(scenario: Optional[Literal["normal", "slow", "very_slow"]] = None):
    with db.connect() as conn:
        p = eng.slow_week_plan(load_income(conn), load_expenses(conn), load_bills(conn), load_settings(conn), date.today())
    p = {k: {"income": dollars(v["income_cents"]), "safe_to_spend": dollars(v["safe_cents"]),
             "short_by": dollars(v["short_by_cents"]), "covers_bills_and_taxes": v["covers_bills_and_taxes"]}
         for k, v in p.items()}
    return p[scenario] if scenario else p
