import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Heart, HelpCircle, Layers, Lock, Shield, Sprout, Zap } from "lucide-react";
import { api, type Summary } from "../api";
import { ErrorState, EstimateTag, Loading, Notice, Pill, Segmented, TabPage } from "../components/ui";
import { capitalize, cleanAmount, dueLabel, money, pct, wholeMoney } from "../format";

const PRESETS = [
  { value: "normal", title: "Normal", income: 450 },
  { value: "slow", title: "Slow", income: 250 },
  { value: "very_slow", title: "Very slow", income: 120 },
] as const;

type Choice = (typeof PRESETS)[number]["value"] | "custom";

export default function Plan() {
  const [choice, setChoice] = useState<Choice>("slow");
  const [custom, setCustom] = useState("300");
  const income = choice === "custom" ? Number(custom) || 0 : PRESETS.find((p) => p.value === choice)!.income;

  const plan = useQuery({ queryKey: ["plan", income], queryFn: () => api.plan(income), placeholderData: (prev) => prev });
  const summary = useQuery({ queryKey: ["summary"], queryFn: api.summary });

  return (
    <TabPage title="Plan">
      <div className="flex items-center justify-between px-1 pt-2">
        <Pill tone="good">
          <Shield size={14} aria-hidden="true" /> Protected runway
        </Pill>
      </div>
      <h1 className="mt-2 px-1 text-[26px] font-bold">Slow-week planner</h1>
      <p className="px-1 text-[16px] text-ink-muted">
        Plan without stress{summary.data?.name ? `, ${summary.data.name}` : ""}. These are what-if scenarios, not predictions.
      </p>

      <section className="card mt-4 p-4" aria-labelledby="whatif-h">
        <h2 id="whatif-h" className="flex items-center gap-2 text-[17px] font-bold">
          <CalendarRange size={20} className="text-teal" aria-hidden="true" /> What if next week is slow?
        </h2>
        <p className="mb-3 mt-0.5 text-[15px] text-ink-muted">Pick a week's income to try it out.</p>
        <Segmented
          label="Scenario"
          value={choice}
          onChange={setChoice}
          options={[...PRESETS.map((p) => ({ value: p.value as Choice, title: p.title, sub: wholeMoney(p.income) })), { value: "custom" as Choice, title: "Custom", sub: "Any $" }]}
        />
        {choice === "custom" && (
          <div className="mt-3">
            <label htmlFor="custom" className="label">
              Week's income
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true">$</span>
              <input
                id="custom"
                inputMode="decimal"
                className="field pl-8 tabular"
                value={custom}
                onChange={(e) => setCustom(cleanAmount(e.target.value))}
              />
            </div>
          </div>
        )}
      </section>

      {plan.isLoading && <Loading />}
      {plan.isError && <ErrorState error={plan.error} retry={() => plan.refetch()} />}
      {plan.data && (
        <section className="card mt-4 p-5" aria-labelledby="result-h" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="neutral">{PRESETS.find((p) => p.value === choice)?.title ?? "Custom"} week ({wholeMoney(income)} est.)</Pill>
                <EstimateTag />
              </div>
              <h2 id="result-h" className="mt-3 text-[15px] font-semibold text-ink-muted">
                Safe to spend would be
              </h2>
              <p className="tabular text-[30px] font-bold leading-tight text-teal-dark">
                {plan.data.short_by > 0 ? "$0" : `About ${wholeMoney(plan.data.range.low)} – ${wholeMoney(plan.data.range.high)}`}
              </p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-ink">
              <Sprout size={24} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4">
            {plan.data.short_by > 0 ? (
              <Notice tone="caution">
                <strong>You'd be short by {money(plan.data.short_by)}.</strong>{" "}
                {plan.data.covers_bills_and_taxes
                  ? "Bills and taxes would still be covered, but there'd be nothing left for extras."
                  : "This week's bill share and taxes wouldn't be fully covered. Your cushion is there for weeks like this."}
              </Notice>
            ) : (
              <Notice tone="good">
                <strong>You'd stay covered.</strong> Taxes and this week's share of your bills still come out first.
              </Notice>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-[15px]">
            <div className="rounded-xl bg-surface px-3 py-2.5">
              <dt className="text-[14px] text-ink-muted">Fixed bills shield</dt>
              <dd className={`tabular text-[17px] font-bold ${plan.data.covers_bills_and_taxes ? "text-mint-ink" : "text-amber-ink"}`}>
                {plan.data.covers_bills_and_taxes ? "100% covered" : "Partly covered"}
              </dd>
            </div>
            <div className="rounded-xl bg-surface px-3 py-2.5">
              <dt className="text-[14px] text-ink-muted">Taxes set aside</dt>
              <dd className="tabular text-[17px] font-bold">{money(plan.data.breakdown.tax_set_aside)}</dd>
            </div>
          </dl>
          <Link to="/explainer" className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-teal">
            <HelpCircle size={18} aria-hidden="true" /> How is this calculated?
          </Link>
        </section>
      )}

      {summary.data && <CushionCard s={summary.data} />}
      {summary.data && <NextTwoWeeks s={summary.data} />}
      {summary.data && (
        <section className="mt-4 flex items-start gap-3 rounded-card bg-surface p-4" aria-label="Runway">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-ink" aria-hidden="true">
            <Heart size={20} />
          </span>
          <div>
            <h2 className="text-[16px] font-bold">
              {summary.data.next_two_weeks.remaining === 0 ? "You have plenty of runway" : "Your plan is catching up"}
            </h2>
            <p className="mt-0.5 text-[15px] text-ink-muted">
              {summary.data.next_two_weeks.remaining === 0
                ? "Gig work has quiet weeks, and your plan is absorbing them. Your essential bills are already set aside."
                : `${money(summary.data.next_two_weeks.remaining)} of the next two weeks' bills still needs setting aside. Steady takes a share from each week's income until it's covered.`}
            </p>
          </div>
        </section>
      )}
    </TabPage>
  );
}

function CushionCard({ s }: { s: Summary }) {
  const c = s.cushion;
  return (
    <section className="card mt-4 p-4" aria-labelledby="cushion-h">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-soft text-mint-ink" aria-hidden="true">
            <Layers size={20} />
          </span>
          <div>
            <h2 id="cushion-h" className="text-[17px] font-bold">
              Slow-period cushion
            </h2>
            <p className="text-[14px] text-ink-muted">Goal: one month of your bills</p>
          </div>
        </div>
        <Pill tone="good">{Math.round(c.progress * 100)}% full</Pill>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="tabular text-[22px] font-bold text-teal-dark">{money(c.saved)} set aside</p>
        <p className="tabular text-[15px] text-ink-muted">Goal {money(c.goal)}</p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div className="h-full rounded-full bg-teal" style={{ width: `${c.progress * 100}%` }} />
      </div>
      <p className="mt-3 text-[15px]">
        {capitalize(s.cushion_level)} cushion ({pct(s.cushion_rate)}) added <strong className="tabular">{money(s.breakdown.cushion)}</strong>{" "}
        this week.
      </p>
      <Link to="/settings" className="btn-soft mt-3 w-full">
        Change cushion strength
      </Link>
    </section>
  );
}

function NextTwoWeeks({ s }: { s: Summary }) {
  const n = s.next_two_weeks;
  return (
    <section className="card mt-4 p-4" aria-labelledby="next-h">
      <h2 id="next-h" className="text-[17px] font-bold">
        Next 2 weeks out
      </h2>
      <p className="text-[14px] text-ink-muted">Upcoming bills compared with what's already set aside</p>
      {n.bills.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-surface p-3 text-[15px] text-ink-muted">No bills due in the next 14 days.</p>
      ) : (
        <>
          <div className="mt-3 rounded-2xl bg-surface p-3">
            <p className="tabular flex items-center justify-between text-[16px] font-bold">
              <span>Bills due in the next 2 weeks</span>
              <span>{money(n.total)}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {n.bills.map((b) => (
                <Pill key={b.id} tone="neutral">
                  {b.name} {money(b.amount)} · {dueLabel(b.due_date).replace("Due ", "due ")}
                </Pill>
              ))}
            </div>
          </div>
          <p className="tabular mt-2 flex items-center justify-between rounded-2xl bg-mint-soft/70 px-3 py-3 text-[15px]">
            <span className="flex items-center gap-2 font-semibold">
              <Lock size={16} aria-hidden="true" /> Already set aside
            </span>
            <strong>{money(n.reserved)}</strong>
          </p>
          <p className="tabular mt-2 flex items-center justify-between rounded-2xl bg-surface px-3 py-3 text-[15px]">
            <span className="flex items-center gap-2 font-semibold">
              <Zap size={16} aria-hidden="true" /> Still to cover
            </span>
            <strong>{money(n.remaining)}</strong>
          </p>
          <div className="mt-3 flex items-center justify-between text-[14px] text-ink-muted">
            <span>Coverage</span>
            <span className="tabular font-semibold text-ink">{Math.round(n.coverage * 100)}% set aside</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <div className="h-full rounded-full bg-teal" style={{ width: `${n.coverage * 100}%` }} />
          </div>
        </>
      )}
    </section>
  );
}
