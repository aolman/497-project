"""The nine predefined test cases from the Steady Backend Design doc.
Run with:  pytest -v
"""
from datetime import date, timedelta

import pytest

from engine import (Bill, Entry, Settings, entry_breakdown, pct, safe_to_spend, validate_amount,
                    validate_category, week_start, week_total, weekly_history)

MON = date(2026, 10, 26)          # a Monday
WED = MON + timedelta(days=2)
SUN = MON + timedelta(days=6)
STEADY = [41200, 40000, 42000, 39000]   # recent weeks with little swing


def in_weeks(n: int) -> date:
    return MON + timedelta(weeks=n)


def test_1_worked_example_matches_home_mockup():
    income = [Entry(41200, MON)]
    bills = [Bill("Phone", 4500, WED, reserved_cents=4500), Bill("Rent", 85000, in_weeks(4), reserved_cents=53000)]
    r = safe_to_spend(income, [], bills, Settings(0.20, "strong"), WED, STEADY)
    assert (r.tax_cents, r.cushion_cents, r.bills_cents) == (8240, 6180, 8000)
    assert r.exact_cents == 18780                       # $187.80
    assert (r.low_cents, r.high_cents) == (17000, 19000)
    assert r.label() == "About $170 – $190"


def test_2_spending_and_partly_reserved_rent():
    income = [Entry(30000, MON)]
    expenses = [Entry(4500, WED)]
    bills = [Bill("Rent", 85000, in_weeks(2), reserved_cents=65000)]
    r = safe_to_spend(income, expenses, bills, Settings(0.20, "moderate"), WED)
    assert r.exact_cents == 6500                        # 300 - 60 - 30 - 100 - 45


def test_3_short_week_shows_zero_and_short_by():
    income = [Entry(12000, MON)]
    bills = [Bill("Insurance", 15000, SUN)]
    r = safe_to_spend(income, [], bills, Settings(0.20, "light"), WED)
    assert r.exact_cents == -6000
    assert r.shown_cents == 0 and r.short_by_cents == 6000
    assert "Short by $60.00" in r.label()


def test_4_no_income_only_spending():
    r = safe_to_spend([], [Entry(2000, MON)], [], Settings(), WED)
    assert r.shown_cents == 0 and r.short_by_cents == 2000


def test_5_variable_income_across_sources_stays_in_its_week():
    income = [Entry(9400, MON, "DoorDash"), Entry(12000, WED, "Uber Eats"),
              Entry(20000, SUN, "Freelance"), Entry(5000, MON + timedelta(days=7), "DoorDash")]
    assert week_total(income, week_start(WED)) == 41400


def test_6_tax_set_aside_rates():
    assert pct(41200, 0.25) == 10300
    assert pct(9400, 0.15) == 1410
    assert entry_breakdown(9400, Settings(0.20, "moderate")) == {
        "amount_cents": 9400, "tax_cents": 1880, "cushion_cents": 940, "toward_spending_cents": 6580}


def test_7_income_variability_counts_empty_weeks():
    this = week_start(in_weeks(3))
    income = [Entry(45000, this - timedelta(weeks=3)), Entry(25000, this - timedelta(weeks=2)),
              Entry(38000, this)]                         # week -1 has no entries
    h = weekly_history(income, this, n=4)
    assert [w["total_cents"] for w in h["weeks"]] == [45000, 25000, 0, 38000]
    assert (h["highest_cents"], h["lowest_cents"], h["average_cents"]) == (45000, 0, 27000)


@pytest.mark.parametrize("bad", [-1000, 0])
def test_8_expense_validation_rejects_bad_amounts(bad):
    with pytest.raises(ValueError):
        validate_amount(bad)


def test_8_expense_validation_accepts_good_entry():
    validate_amount(1250)
    validate_category("groceries")
    with pytest.raises(ValueError):
        validate_category("yachts")


def test_9_fully_reserved_bill_asks_for_nothing():
    bills = [Bill("Rent", 85000, in_weeks(3), reserved_cents=85000)]
    r = safe_to_spend([], [], bills, Settings(), WED)
    assert r.bills_cents == 0
