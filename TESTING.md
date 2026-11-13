# Steady peer-review usability test

**Goal:** watch another team use Steady with no help, and find where they get stuck before the final submission.
Each task maps to one of our usability targets:

- **Enter without help:** 80% finish core tasks unassisted
- **Record fast:** 80% log an income entry within 45 seconds
- **Understand the number:** 80% correctly explain what safe to spend means

## Before the session

1. Start the backend (`uvicorn main:app --reload`) and the frontend (`npm run dev`). Open http://localhost:5173.
2. In **Settings → For test sessions**, tap **Start fresh**. The tester begins on the Welcome screen.
3. Assign roles: one **facilitator** reads the tasks, one or two **observers** take notes and time Task 3.

## What the facilitator says (read aloud)

> "Thanks for helping. We're testing the app, not you, so there are no wrong answers. Please think out loud: say what
> you're looking at, what you expect to happen, and anything that confuses you. We won't help during the tasks,
> because we want to see where the app needs to be clearer. Imagine you're a delivery driver who does DoorDash and
> Uber Eats, and your income changes every week."

**During tasks:** don't point, hint or explain. If they ask a question, answer "What would you try?" If they're stuck
for more than about 2 minutes, mark the task as not completed and move on.

## Tasks

| # | Read this to the tester | Done when | Target |
| --- | --- | --- | --- |
| 1 | "You just downloaded Steady. Set it up for your DoorDash and Uber Eats work." | Reaches Home with both sources | Without help |

**Facilitator, after Task 1:** go to Settings → For test sessions → **Load demo week**. The tester is now Maya, with a
week of income and four bills.

| # | Read this to the tester | Done when | Target |
| --- | --- | --- | --- |
| 2 | "How much can you safely spend this week? In your own words, what does that number mean?" | Says it's what's left after taxes, a cushion and bills, and that it's an estimate | Understand |
| 3 | "You just finished a DoorDash shift and made $94. Record it." *(start timer when you finish reading)* | Saved $94 from DoorDash. Note seconds. | Record fast (≤ 45 s) |
| 4 | "You spent $23.50 on groceries today. Record that." | Saved $23.50 as Groceries | Without help |
| 5 | "Your rent is $850. How much of this week's money is going toward rent, and why that amount?" | Finds the explainer: $80, because $320 is still needed over 4 weeks | Understand |
| 6 | "Which of the last 8 weeks was your slowest, and how much did you make?" | Activity → 8-week chart, names the amber week | Without help |
| 7 | "Next week might be slow, maybe $250. Would you still be okay?" | Plan → Slow, reads the range and "You'd stay covered" | Understand |
| 8 | "You want to set aside more for taxes: 35%. Change it. What happened to your safe-to-spend number?" | Settings slider → 35% → saves, then notices Home went down | Without help |
| 9 | "Add your car payment: $210, due on the 1st of every month." | New bill appears in Bills | Without help |

## Observer note sheet (one per tester)

| Task | Finished alone? (Y / N / with hint) | Time | Where they hesitated or went wrong | What they said (quotes) | Severity (1 minor – 3 blocker) |
| --- | --- | --- | --- | --- | --- |
| 1 Setup | | | | | |
| 2 Safe to spend | | | | | |
| 3 Log $94 | | ___ s | | | |
| 4 Log $23.50 | | | | | |
| 5 Rent share | | | | | |
| 6 Slowest week | | | | | |
| 7 Slow week plan | | | | | |
| 8 Tax rate | | | | | |
| 9 Add bill | | | | | |

**Watch for:** tapping things that aren't buttons, scrolling past the Save button, confusion about "Estimate" or the
range, mixing up the cushion with taxes, not finding "How is this calculated?", reading "Short by" as an error.

## Wrap-up questions (2 minutes)

1. What was the most confusing moment?
2. On a scale of 1 to 5, how much would you trust the safe-to-spend number? Why?
3. Was anything missing that you expected to find?
4. Would you use this over a notes app or spreadsheet? What would make you switch?

## After the session

Count each target: tasks finished unassisted ÷ tasks attempted, testers who logged income in ≤ 45 s, and testers who
explained safe to spend correctly. List every issue with its severity, then fix the 3s first.
