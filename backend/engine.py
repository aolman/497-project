"""Steady calculation engine.

Pure functions only: no database, no web code. Every amount is in integer
cents so totals never drift from floating-point rounding.

Formula (one week, Monday to Sunday):
    safe = I - t*I - c*I - B - S
      I = income this week
      t = tax set-aside rate
      c = cushion rate (light 5%, moderate 10%, strong 15%)
      B = this week's share of upcoming bills
      S = spent this week
"""
from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import date, timedelta

CUSHION_RATES = {"light": 0.05, "moderate": 0.10, "strong": 0.15}
CATEGORIES = {"groceries", "gas", "rent", "utilities", "phone", "fun", "dining", "other"}
STEADY_MARGIN = 0.10      # low end of range when income has been steady
UNSTEADY_MARGIN = 0.20    # low end of range when income swings a lot
SWING_THRESHOLD = 0.25    # std dev above 25% of the average counts as "swings"
SE_TAX_REMINDER_CENTS = 400_00


# ---------- small helpers ----------

def week_start(d: date) -> date:
    """Monday of the week containing d."""
    return d - timedelta(days=d.weekday())


def in_week(d: date, start: date) -> bool:
    return start <= d < start + timedelta(days=7)


def pct(cents: int, rate: float) -> int:
    """rate of an amount, rounded half-up to the nearest cent."""
    return int(cents * rate + 0.5)


def round_to_5_dollars(cents: int) -> int:
    return ((cents + 250) // 500) * 500


def validate_amount(cents: int) -> None:
    if not isinstance(cents, int) or cents <= 0:
        raise ValueError("Amount must be greater than $0.")


def validate_category(category: str) -> None:
    if category not in CATEGORIES:
        raise ValueError(f"Category must be one of: {', '.join(sorted(CATEGORIES))}.")


# ---------- inputs ----------

@dataclass
class Entry:
    amount_cents: int
    on: date
    source: str = ""


@dataclass
class Bill:
    name: str
    amount_cents: int
    due: date
    reserved_cents: int = 0
    paid: bool = False


@dataclass
class Settings:
    tax_rate: float = 0.20
    cushion_level: str = "moderate"

    @property
    def cushion_rate(self) -> float:
        return CUSHION_RATES[self.cushion_level]


# ---------- core calculations ----------

def week_total(entries: list[Entry], start: date) -> int:
    return sum(e.amount_cents for e in entries if in_week(e.on, start))


def weeks_until_due(due: date, this_week: date) -> int:
    """Whole weeks from this week to the bill's week; at least 1."""
    return max(1, (week_start(due) - this_week).days // 7)


def bills_reserve(bills: list[Bill], this_week: date) -> tuple[int, list[dict]]:
    """This week's share of what is still missing for each unpaid bill."""
    total, lines = 0, []
    for b in bills:
        if b.paid:
            continue
        missing = max(0, b.amount_cents - b.reserved_cents)
        weeks = weeks_until_due(b.due, this_week)
        share = (missing + weeks - 1) // weeks  # round up so the bill is covered in time
        total += share
        lines.append({"bill": b.name, "missing_cents": missing, "weeks_left": weeks, "this_week_cents": share})
    return total, lines


def entry_breakdown(amount_cents: int, s: Settings) -> dict:
    """How one income entry splits (Log income screen)."""
    validate_amount(amount_cents)
    tax = pct(amount_cents, s.tax_rate)
    cushion = pct(amount_cents, s.cushion_rate)
    return {"amount_cents": amount_cents, "tax_cents": tax, "cushion_cents": cushion,
            "toward_spending_cents": amount_cents - tax - cushion}


def income_swings(recent_week_totals: list[int]) -> bool:
    if len(recent_week_totals) < 2:
        return False
    avg = statistics.mean(recent_week_totals)
    if avg == 0:
        return False
    return statistics.pstdev(recent_week_totals) > SWING_THRESHOLD * avg


@dataclass
class Summary:
    income_cents: int
    tax_cents: int
    cushion_cents: int
    bills_cents: int
    spent_cents: int
    exact_cents: int
    shown_cents: int
    low_cents: int
    high_cents: int
    short_by_cents: int
    swings: bool
    bill_lines: list = field(default_factory=list)

    def label(self) -> str:
        if self.short_by_cents:
            return f"$0 · Short by ${self.short_by_cents / 100:,.2f} this week"
        return f"About ${self.low_cents // 100:,} – ${self.high_cents // 100:,}"


def safe_to_spend(income: list[Entry], expenses: list[Entry], bills: list[Bill], s: Settings,
                  today: date, recent_week_totals: list[int] | None = None,
                  income_override_cents: int | None = None) -> Summary:
    """The number on Home. `income_override_cents` is used by the slow-week planner."""
    start = week_start(today)
    i = week_total(income, start) if income_override_cents is None else income_override_cents
    tax = pct(i, s.tax_rate)
    cushion = pct(i, s.cushion_rate)
    b, lines = bills_reserve(bills, start)
    spent = week_total(expenses, start)
    exact = i - tax - cushion - b - spent

    swings = income_swings(recent_week_totals or [])
    if exact <= 0:
        shown = low = high = 0
        short_by = -exact
    else:
        shown, short_by = exact, 0
        margin = UNSTEADY_MARGIN if swings else STEADY_MARGIN
        high = round_to_5_dollars(exact)
        low = round_to_5_dollars(int(exact * (1 - margin)))
    return Summary(i, tax, cushion, b, spent, exact, shown, low, high, short_by, swings, lines)


def tax_reserve(income: list[Entry], s: Settings, today: date) -> dict:
    """Tax reserve screen: this quarter and year-to-date set-aside."""
    q_start_month = 3 * ((today.month - 1) // 3) + 1
    q_start = date(today.year, q_start_month, 1)
    y_start = date(today.year, 1, 1)
    quarter = sum(e.amount_cents for e in income if q_start <= e.on <= today)
    ytd = sum(e.amount_cents for e in income if y_start <= e.on <= today)
    return {"quarter_income_cents": quarter, "quarter_set_aside_cents": pct(quarter, s.tax_rate),
            "ytd_income_cents": ytd, "ytd_set_aside_cents": pct(ytd, s.tax_rate),
            "self_employment_reminder": ytd > SE_TAX_REMINDER_CENTS}


def weekly_history(income: list[Entry], today: date, n: int = 8) -> dict:
    """Activity screen: last n weeks including this one, oldest first. Empty weeks count as $0."""
    this = week_start(today)
    starts = [this - timedelta(weeks=k) for k in range(n - 1, -1, -1)]
    totals = [week_total(income, st) for st in starts]
    return {"weeks": [{"week_of": st.isoformat(), "total_cents": t} for st, t in zip(starts, totals)],
            "highest_cents": max(totals), "lowest_cents": min(totals),
            "average_cents": int(statistics.mean(totals) + 0.5),
            "std_dev_cents": int(statistics.pstdev(totals) + 0.5)}


def slow_week_plan(income: list[Entry], expenses: list[Entry], bills: list[Bill], s: Settings,
                   today: date) -> dict:
    """What-if scenarios using the user's own history (completed weeks only)."""
    this = week_start(today)
    past4 = [week_total(income, this - timedelta(weeks=k)) for k in range(1, 5)]
    past8 = [week_total(income, this - timedelta(weeks=k)) for k in range(1, 9)]
    scenarios = {"normal": int(statistics.mean(past4) + 0.5), "slow": min(past8)}
    scenarios["very_slow"] = scenarios["slow"] // 2
    out = {}
    for name, inc in scenarios.items():
        r = safe_to_spend(income, expenses, bills, s, today, past4, income_override_cents=inc)
        out[name] = {"income_cents": inc, "safe_cents": r.shown_cents, "short_by_cents": r.short_by_cents,
                     "covers_bills_and_taxes": inc - r.tax_cents >= r.bills_cents}
    return out
