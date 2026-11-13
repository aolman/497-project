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
import seed

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


def bill_out(r) -> dict:
    """One bill as the screens show it, with a funded / saving status."""
    amount, reserved = r["amount_cents"], min(r["reserved_cents"], r["amount_cents"])
    return {"id": r["id"], "name": r["name"], "amount": dollars(amount), "due_date": r["due_date"],
            "repeat": r["repeat"], "reserved": dollars(reserved),
            "status": "funded" if reserved >= amount else "saving",
            "progress": round(reserved / amount, 3) if amount else 1.0}


# ---------- request bodies ----------

class SettingsIn(BaseModel):
    tax_rate: float = Field(ge=0, le=0.5, examples=[0.20])
    cushion_level: Literal["light", "moderate", "strong"] = "moderate"
    name: Optional[str] = Field(default=None, max_length=40)


class SourceIn(BaseModel):
    name: str = Field(min_length=1, max_length=40, examples=["DoorDash"])


class IncomeIn(BaseModel):
    source_id: int = Field(examples=[1])
    amount: float = Field(gt=0, le=100000, examples=[94.00])
    date_earned: date = Field(default_factory=date.today)
    note: Optional[str] = Field(default=None, max_length=120)


class ExpenseIn(BaseModel):
    amount: float = Field(gt=0, le=100000, examples=[23.50])
    date: dt.date = Field(default_factory=dt.date.today)
    category: str = Field(examples=["groceries"])
    note: Optional[str] = Field(default=None, max_length=120)


class BillIn(BaseModel):
    name: str = Field(min_length=1, max_length=40, examples=["Rent"])
    amount: float = Field(gt=0, le=100000, examples=[850.00])
    due_date: date
    repeat: Literal["none", "weekly", "monthly"] = "monthly"
    reserved: float = Field(default=0, ge=0)


class ResetIn(BaseModel):
    mode: Literal["demo", "empty"] = "demo"


# ---------- setup ----------

@app.get("/status", tags=["Setup"])
def status():
    """Whether setup is finished, so the app knows to show Welcome or Home."""
    with db.connect() as conn:
        r = conn.execute("SELECT name, onboarded FROM settings WHERE id = 1").fetchone()
        n = conn.execute("SELECT COUNT(*) AS n FROM income_sources").fetchone()["n"]
    return {"onboarded": bool(r["onboarded"]) and n > 0, "name": r["name"], "sources": n,
            "today": date.today().isoformat()}


@app.post("/setup/complete", tags=["Setup"])
def setup_complete():
    with db.connect() as conn:
        if not conn.execute("SELECT COUNT(*) AS n FROM income_sources").fetchone()["n"]:
            raise HTTPException(400, "Add at least one income source first.")
        conn.execute("UPDATE settings SET onboarded = 1 WHERE id = 1")
    return status()


@app.post("/reset", tags=["Setup"])
def reset(body: ResetIn):
    """For test sessions: load Maya's demo week, or start empty to go through setup."""
    with db.connect() as conn:
        if body.mode == "demo":
            seed.load_demo(conn)
        else:
            db.wipe(conn)
    return status()


@app.get("/settings", tags=["Setup"])
def get_settings():
    with db.connect() as conn:
        s = load_settings(conn)
        name = conn.execute("SELECT name FROM settings WHERE id = 1").fetchone()["name"]
    return {"tax_rate": s.tax_rate, "cushion_level": s.cushion_level, "cushion_rate": s.cushion_rate,
            "name": name, "categories": sorted(eng.CATEGORIES)}


@app.put("/settings", tags=["Setup"])
def put_settings(body: SettingsIn):
    with db.connect() as conn:
        conn.execute("UPDATE settings SET tax_rate = ?, cushion_level = ? WHERE id = 1",
                     (body.tax_rate, body.cushion_level))
        if body.name is not None:
            conn.execute("UPDATE settings SET name = ? WHERE id = 1", (body.name.strip(),))
    return get_settings()


@app.get("/sources", tags=["Setup"])
def list_sources():
    with db.connect() as conn:
        return [dict(r) for r in conn.execute("SELECT id, name FROM income_sources ORDER BY id")]


@app.post("/sources", tags=["Setup"], status_code=201)
def add_source(body: SourceIn):
    name = body.name.strip()
    with db.connect() as conn:
        conn.execute("INSERT OR IGNORE INTO income_sources (name) VALUES (?)", (name,))
        row = conn.execute("SELECT id, name FROM income_sources WHERE name = ?", (name,)).fetchone()
    return dict(row)


@app.delete("/sources/{source_id}", tags=["Setup"])
def delete_source(source_id: int):
    with db.connect() as conn:
        if conn.execute("SELECT 1 FROM income_entries WHERE source_id = ?", (source_id,)).fetchone():
            raise HTTPException(400, "This source has income logged, so it can't be removed.")
        conn.execute("DELETE FROM income_sources WHERE id = ?", (source_id,))
    return {"id": source_id, "deleted": True}


# ---------- logging ----------

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


@app.get("/preview", tags=["Log"])
def preview_income(amount: float):
    """How an income entry would split, shown live on Log income before saving."""
    if amount <= 0:
        return {"amount": 0, "tax": 0, "cushion": 0, "toward_spending": 0}
    with db.connect() as conn:
        b = eng.entry_breakdown(cents(amount), load_settings(conn))
    return {k.removesuffix("_cents"): dollars(v) for k, v in b.items()}


@app.delete("/income/{entry_id}", tags=["Log"])
def delete_income(entry_id: int):
    with db.connect() as conn:
        if not conn.execute("DELETE FROM income_entries WHERE id = ?", (entry_id,)).rowcount:
            raise HTTPException(404, "Income entry not found.")
    return {"id": entry_id, "deleted": True}


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


@app.delete("/expenses/{expense_id}", tags=["Log"])
def delete_expense(expense_id: int):
    with db.connect() as conn:
        if not conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,)).rowcount:
            raise HTTPException(404, "Expense not found.")
    return {"id": expense_id, "deleted": True}


@app.get("/activity", tags=["Activity"])
def activity(week: Optional[date] = None):
    """Income and expenses for one week, newest first, with this week's and last week's totals."""
    start = eng.week_start(week or date.today())
    end = start + timedelta(days=6)
    with db.connect() as conn:
        inc = conn.execute("SELECT e.id, s.name AS label, e.amount_cents, e.date_earned AS date, e.note "
                           "FROM income_entries e JOIN income_sources s ON s.id = e.source_id "
                           "WHERE e.date_earned BETWEEN ? AND ?", (start.isoformat(), end.isoformat())).fetchall()
        exp = conn.execute("SELECT id, category AS label, amount_cents, date, note FROM expenses "
                           "WHERE date BETWEEN ? AND ?", (start.isoformat(), end.isoformat())).fetchall()
        all_inc, all_exp = load_income(conn), load_expenses(conn)
    items = ([{"kind": "income", **dict(r), "amount": dollars(r["amount_cents"])} for r in inc]
             + [{"kind": "expense", **dict(r), "amount": dollars(r["amount_cents"])} for r in exp])
    items.sort(key=lambda x: (x["date"], x["kind"] == "income", x["id"]), reverse=True)
    with db.connect() as conn:
        st, bills = load_settings(conn), load_bills(conn)
    for it in items:
        if it["kind"] == "income":
            it["tax_held"] = dollars(eng.pct(it["amount_cents"], st.tax_rate))
        it.pop("amount_cents")
    wk = eng.safe_to_spend(all_inc, all_exp, bills, st, start)
    last = start - timedelta(weeks=1)
    return {"week_of": start.isoformat(), "week_end": end.isoformat(), "items": items,
            "income": dollars(eng.week_total(all_inc, start)), "spent": dollars(eng.week_total(all_exp, start)),
            "last_week_income": dollars(eng.week_total(all_inc, last)),
            "last_week_spent": dollars(eng.week_total(all_exp, last)),
            "reserved": dollars(wk.tax_cents + wk.cushion_cents + wk.bills_cents),
            "tax_rate": st.tax_rate}


# ---------- bills ----------

@app.get("/bills", tags=["Bills"])
def list_bills():
    with db.connect() as conn:
        rows = conn.execute("SELECT * FROM bills WHERE paid = 0 ORDER BY due_date").fetchall()
    return [bill_out(r) for r in rows]


@app.post("/bills", tags=["Bills"], status_code=201)
def add_bill(body: BillIn):
    with db.connect() as conn:
        cur = conn.execute("INSERT INTO bills (name, amount_cents, due_date, repeat, reserved_cents) VALUES (?,?,?,?,?)",
                           (body.name.strip(), cents(body.amount), body.due_date.isoformat(), body.repeat,
                            cents(body.reserved)))
    return {"id": cur.lastrowid}


@app.delete("/bills/{bill_id}", tags=["Bills"])
def delete_bill(bill_id: int):
    with db.connect() as conn:
        if not conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,)).rowcount:
            raise HTTPException(404, "Bill not found.")
    return {"id": bill_id, "deleted": True}


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


# ---------- home ----------

def summary_out(r: eng.Summary, today: date) -> dict:
    start = eng.week_start(today)
    return {
        "week_of": start.isoformat(),
        "week_end": (start + timedelta(days=6)).isoformat(),
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


@app.get("/summary", tags=["Home"])
def summary(week: Optional[date] = None):
    """The safe-to-spend number on Home, with every line of the breakdown."""
    today = week or date.today()
    with db.connect() as conn:
        s, inc, exp, bills = load_settings(conn), load_income(conn), load_expenses(conn), load_bills(conn)
        rows = conn.execute("SELECT * FROM bills WHERE paid = 0 ORDER BY due_date").fetchall()
        name = conn.execute("SELECT name FROM settings WHERE id = 1").fetchone()["name"]
        src_rows = conn.execute(
            "SELECT s.name, SUM(e.amount_cents) AS total, COUNT(*) AS n, MAX(e.date_earned) AS last "
            "FROM income_entries e JOIN income_sources s ON s.id = e.source_id "
            "WHERE e.date_earned BETWEEN ? AND ? GROUP BY s.id ORDER BY total DESC",
            (eng.week_start(today).isoformat(), (eng.week_start(today) + timedelta(days=6)).isoformat())).fetchall()
    r = eng.safe_to_spend(inc, exp, bills, s, today, recent_weeks(inc, today))
    out = summary_out(r, today)
    week_income = r.income_cents or 1
    out.update({"name": name, "tax_rate": s.tax_rate, "cushion_level": s.cushion_level,
                "cushion_rate": s.cushion_rate, "upcoming_bills": [bill_out(b) for b in rows],
                "sources_this_week": [{"name": x["name"], "total": dollars(x["total"]), "entries": x["n"],
                                       "last_date": x["last"], "share": round(x["total"] / week_income, 3)}
                                      for x in src_rows],
                "cushion": cushion_progress(inc, bills, s),
                "next_two_weeks": next_two_weeks(rows, today)})
    return out


def cushion_progress(inc: list[eng.Entry], bills: list[eng.Bill], s: eng.Settings) -> dict:
    """Cushion set aside so far (all logged income x cushion rate) against a goal of one month of bills."""
    saved = eng.pct(sum(e.amount_cents for e in inc), s.cushion_rate)
    monthly_bills = sum(b.amount_cents for b in bills if not b.paid)
    goal = int(round(monthly_bills / 500)) * 500 or 30000   # one month of bills, nearest $5 ($300 if no bills)
    return {"saved": dollars(saved), "goal": dollars(goal), "progress": round(min(saved / goal, 1), 3)}


def next_two_weeks(rows, today: date) -> dict:
    """Bills due in the next 14 days, what's already set aside, and what's left to cover."""
    end = today + timedelta(days=14)
    due = [r for r in rows if today <= db.to_date(r["due_date"]) <= end]
    total = sum(r["amount_cents"] for r in due)
    reserved = sum(min(r["reserved_cents"], r["amount_cents"]) for r in due)
    return {"total": dollars(total), "reserved": dollars(reserved), "remaining": dollars(total - reserved),
            "bills": [bill_out(r) for r in due],
            "coverage": round(reserved / total, 3) if total else 1.0}


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
        s = load_settings(conn)
        t = eng.tax_reserve(load_income(conn), s, date.today())
        recent = conn.execute("SELECT s.name, e.amount_cents, e.date_earned FROM income_entries e "
                              "JOIN income_sources s ON s.id = e.source_id "
                              "ORDER BY e.date_earned DESC, e.id DESC LIMIT 3").fetchall()
    out = {(k.removesuffix("_cents")): (dollars(v) if k.endswith("_cents") else v) for k, v in t.items()}
    today = date.today()
    q = (today.month - 1) // 3 + 1
    q_start = date(today.year, 3 * (q - 1) + 1, 1)
    q_end = date(today.year + (q == 4), 1 if q == 4 else 3 * q + 1, 1) - timedelta(days=1)
    elapsed, length = (today - q_start).days + 1, (q_end - q_start).days + 1
    projected = int(t["quarter_set_aside_cents"] * length / elapsed) if elapsed else 0
    out.update({"quarter_projection": dollars(round(projected / 500) * 500),
                "quarter_progress": round(t["quarter_set_aside_cents"] / projected, 3) if projected else 0,
                "recent": [{"source": r["name"], "date": r["date_earned"], "amount": dollars(r["amount_cents"]),
                            "set_aside": dollars(eng.pct(r["amount_cents"], s.tax_rate))} for r in recent]})
    out.update({"tax_rate": s.tax_rate, "quarter": q, "year": today.year,
                "quarter_label": ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"][q - 1]})
    return out


@app.get("/plan", tags=["Planner"])
def plan(scenario: Optional[Literal["normal", "slow", "very_slow"]] = None, income: Optional[float] = None):
    """What-if: safe to spend if this week's income were `income` (or a preset from your history)."""
    today = date.today()
    with db.connect() as conn:
        s, inc, exp, bills = load_settings(conn), load_income(conn), load_expenses(conn), load_bills(conn)
        if income is None:
            p = eng.slow_week_plan(inc, exp, bills, s, today)
    if income is not None:
        if income < 0:
            raise HTTPException(400, "Income can't be negative.")
        # Next week hasn't been spent yet, so the scenario leaves out this week's expenses.
        r = eng.safe_to_spend(inc, [], bills, s, today, recent_weeks(inc, today), income_override_cents=cents(income))
        out = summary_out(r, today)
        out["covers_bills_and_taxes"] = r.income_cents - r.tax_cents >= r.bills_cents
        return out
    p = {k: {"income": dollars(v["income_cents"]), "safe_to_spend": dollars(v["safe_cents"]),
             "short_by": dollars(v["short_by_cents"]), "covers_bills_and_taxes": v["covers_bills_and_taxes"]}
         for k, v in p.items()}
    return p[scenario] if scenario else p
