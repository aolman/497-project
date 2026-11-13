# Steady backend

Safe-to-spend engine, SQLite database and API for Steady, a budgeting app for gig workers with irregular income. Free, runs locally, no accounts needed.

## Files

| File | What it is |
| --- | --- |
| `engine.py` | All calculations: safe to spend, per-entry breakdown, tax reserve, weekly history, slow-week planner. No database code. |
| `db.py` | SQLite schema (5 tables) and connection helper. Creates `steady.db`. |
| `main.py` | FastAPI app with the endpoints the screens call. |
| `seed.py` | Resets the database and loads Maya's demo week. |
| `test_engine.py` | The 9 predefined calculation test cases (11 tests). |
| `test_api.py` | End-to-end API checks: setup, reset, activity, planner, bills (8 tests). |

## Run it (Mac)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

pytest -v                  # 19 passed
python seed.py             # load demo data
uvicorn main:app --reload  # start the API
```

Open http://127.0.0.1:8000/docs for the interactive API page.

## Demo script (about 90 seconds)

1. Terminal: `pytest -v` and show **19 passed**. Say: "These are our predefined test cases for the four calculation requirements."
2. Browser at `/docs`: open **GET /summary**, click *Try it out* then *Execute*. Show `About $170 – $190` and the breakdown: $412 income, $82.40 tax, $61.80 cushion, $80 toward rent, $187.80 exact.
3. Open **POST /expenses**, send `{"amount": 20, "category": "groceries"}`. Run **GET /summary** again: safe to spend drops to $167.80.
4. Optional: open `steady.db` in [DB Browser for SQLite](https://sqlitebrowser.org/) (free) to show the 5 tables and the new expense row.
5. Say the key idea: rent is spread across the weeks until it's due, so a good week doesn't look like extra money.

## The formula

`safe = income − tax − cushion − this week's share of bills − spent`, for Monday to Sunday.
Cushion: light 5%, moderate 10%, strong 15%. Each unpaid bill asks for (amount − already reserved) ÷ weeks until due. The range's low end subtracts 10% (or 20% if recent weeks swung a lot) and both ends round to $5. A negative result shows $0 and "Short by $X".

## Endpoints

| Method | Path | Screen |
| --- | --- | --- |
| GET / PUT | `/settings` | Buffer setup, tax rate |
| GET / POST | `/sources` | Income sources |
| POST | `/income` | Log income (returns its breakdown) |
| GET | `/income?week=YYYY-MM-DD` | Activity |
| POST | `/expenses` | Log expense |
| GET / POST | `/bills` | Upcoming bills |
| POST | `/bills/{id}/pay` | Mark paid; repeating bills roll forward |
| GET | `/summary` | Home |
| GET | `/weeks?n=8` | Activity history |
| GET | `/tax` | Tax reserve |
| GET | `/plan?income=250` | Slow-week planner (what-if week) |
| GET | `/status` | Setup done yet? (Welcome vs Home) |
| POST | `/setup/complete` | Finish setup |
| POST | `/reset` | Test sessions: `{"mode": "demo"}` or `{"mode": "empty"}` |
| GET | `/activity?week=YYYY-MM-DD` | Activity list with this/last week totals |
| GET | `/preview?amount=94` | Live tax/cushion split on Log income |
| DELETE | `/income/{id}`, `/expenses/{id}`, `/bills/{id}` | Undo a mistake |

CORS is open, so the exported Stitch pages can call the API with `fetch("http://127.0.0.1:8000/summary")`.
