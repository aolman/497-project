# Steady frontend

React + TypeScript (Vite), Tailwind CSS with the Steady teal palette and DM Sans, TanStack Query for API data.
It talks to the FastAPI backend through Vite's proxy: the app calls `/api/...`, which goes to `http://127.0.0.1:8000`.

## Run it

Start the backend first (see `../README.md`), then:

```bash
cd frontend
npm install        # first time only
npm run dev        # http://localhost:5173
```

## Screens

| Path | Screen |
| --- | --- |
| `/welcome` → `/setup/sources` → `/setup/buffer` | Three setup steps (shown until setup is done) |
| `/` | Home: safe-to-spend range, where the money goes, upcoming bills |
| `/log/income` | Log income: amount pad, source chips, live tax/cushion split |
| `/log/expense` | Log expense: amount pad, category grid |
| `/explainer` | How safe to spend is calculated, line by line |
| `/activity` | This week / last week entries (with delete), 8-week income history |
| `/plan` | Slow-week planner: $450 / $250 / $120 / custom week |
| `/settings` | Tax reserve, tax rate, cushion strength, profile, test-session reset |
| `/bills` | Bills: add, mark paid, remove |

## Files

- `src/api.ts`: every backend call, with types
- `src/format.ts`: money and date formatting
- `src/components/ui.tsx`: header, tab bar, cards, keypad, toast
- `src/screens/*`: one file per screen
