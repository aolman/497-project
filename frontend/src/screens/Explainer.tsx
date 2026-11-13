import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarClock, CheckCircle2, HelpCircle, Info, Landmark, Layers, ReceiptText, ShieldCheck, SlidersHorizontal, Sprout, Wallet } from "lucide-react";
import { api, type CushionLevel, type Summary } from "../api";
import { ErrorState, Loading, Pill, SheetPage, useToast } from "../components/ui";
import { CUSHION_INFO, money, pct, weekRange, wholeMoney } from "../format";

const CUSHION_RATES: Record<CushionLevel, number> = { light: 0.05, moderate: 0.1, strong: 0.15 };

export default function Explainer() {
  const q = useQuery({ queryKey: ["summary"], queryFn: api.summary });
  return (
    <SheetPage title="How it works" icon={<HelpCircle size={22} className="text-teal" aria-hidden="true" />} back>
      {q.isLoading && <Loading />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.data && <Body s={q.data} />}
    </SheetPage>
  );
}

function Body({ s }: { s: Summary }) {
  const b = s.breakdown;
  const short = s.short_by > 0;
  const sourcesLine = s.sources_this_week.map((x) => `${x.name} ${wholeMoney(x.total)}`).join(" · ");
  const billNames = s.bills.filter((l) => l.this_week > 0).map((l) => l.bill);

  const rows = [
    {
      icon: Banknote,
      tint: "bg-mint-soft text-mint-ink",
      title: "Money in hand this week",
      sub: sourcesLine || "No income logged yet",
      value: `+${money(b.income)}`,
      tone: "text-mint-ink",
    },
    {
      icon: Landmark,
      tint: "bg-amber-soft text-amber-ink",
      title: "Estimated tax set-aside",
      badge: pct(s.tax_rate),
      sub: "Held so tax day isn't stressful",
      value: `−${money(b.tax_set_aside)}`,
    },
    {
      icon: Layers,
      tint: "bg-teal-soft text-teal",
      title: "Slow-period cushion",
      badge: pct(s.cushion_rate),
      sub: "Smooths out future lean weeks",
      value: `−${money(b.cushion)}`,
    },
    {
      icon: CalendarClock,
      tint: "bg-[#E7EAF6] text-ink",
      title: "Upcoming bills, this week's share",
      sub: billNames.length ? billNames.join(", ") : "Every bill is already covered",
      value: `−${money(b.bills_reserve)}`,
    },
    {
      icon: ReceiptText,
      tint: "bg-[#E7EAF6] text-ink",
      title: "Already spent this week",
      sub: "From expenses you logged",
      value: `−${money(b.spent)}`,
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[24px] font-bold leading-tight">How your safe to spend works</h1>
      </div>
      <p className="mt-1 px-1 text-[16px] text-ink-muted">
        No guesswork and no made-up budget limits. Steady only counts money you've already received.
      </p>

      <section className="card mt-4 p-4" aria-labelledby="flow-h">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Week of {weekRange(s.week_of, s.week_end)}</p>
            <h2 id="flow-h" className="text-[19px] font-bold">
              {s.name ? `${s.name}'s weekly flow` : "Your weekly flow"}
            </h2>
          </div>
          <Wallet size={22} className="text-teal" aria-hidden="true" />
        </div>
        <ol className="mt-3 space-y-2">
          {rows.map(({ icon: Icon, tint, title, badge, sub, value, tone }) => (
            <li key={title} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tint}`} aria-hidden="true">
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold leading-snug">
                  {title} {badge && <Pill tone="neutral">{badge}</Pill>}
                </p>
                <p className="text-[14px] text-ink-muted">{sub}</p>
              </div>
              <span className={`tabular shrink-0 text-[16px] font-bold ${tone ?? ""}`}>{value}</span>
            </li>
          ))}
        </ol>

        <div className={`mt-4 rounded-2xl p-4 text-center ${short ? "bg-amber-soft" : "bg-mint-soft"}`}>
          <p className={`text-[13px] font-bold uppercase tracking-wide ${short ? "text-amber-ink" : "text-mint-ink"}`}>
            Safe to spend right now
          </p>
          <p className="tabular mt-1 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-[24px] font-bold text-teal-dark">
            <Sprout size={20} aria-hidden="true" />
            {short ? "$0" : `About ${wholeMoney(s.range.low)} – ${wholeMoney(s.range.high)}`}
          </p>
          <p className="mt-2 text-[15px]">
            {short
              ? `You're ${money(s.short_by)} short this week. Bills and taxes come first.`
              : `Exactly ${money(s.safe_to_spend_exact)} after everything above. You can spend this without touching bills or taxes.`}
          </p>
        </div>
      </section>

      <Personalize s={s} />

      <section className="mt-4 flex gap-3 rounded-card bg-surface p-4" aria-labelledby="range-h">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-ink" aria-hidden="true">
          <HelpCircle size={20} />
        </span>
        <div>
          <h2 id="range-h" className="text-[16px] font-bold">
            Why a range?
          </h2>
          <p className="mt-0.5 text-[15px] text-ink-muted">
            Gig payouts and costs shift during the week. The low end leaves a {s.income_swings ? "20%" : "10%"} margin
            {s.income_swings ? " because your income has swung a lot lately" : " because your recent weeks have been fairly steady"}.
            A range gives you breathing room instead of false precision.
          </p>
        </div>
      </section>

      {s.bills.length > 0 && (
        <section className="card mt-4 p-4" aria-labelledby="bills-h">
          <h2 id="bills-h" className="text-[16px] font-bold">
            How bills are spread out
          </h2>
          <p className="mt-1 text-[15px] text-ink-muted">
            Each bill asks for what's still missing, split across the weeks until it's due, so one good week doesn't look
            like extra money.
          </p>
          <table className="mt-3 w-full text-left text-[15px]">
            <thead className="text-[14px] text-ink-muted">
              <tr>
                <th className="py-1 font-semibold">Bill</th>
                <th className="py-1 text-right font-semibold">Still needed</th>
                <th className="py-1 text-right font-semibold">This week</th>
              </tr>
            </thead>
            <tbody>
              {s.bills.map((l) => (
                <tr key={l.bill} className="border-t border-surface-line">
                  <td className="py-2">
                    {l.bill}
                    <span className="block text-[14px] text-ink-muted">
                      {l.missing === 0 ? "Fully set aside" : `${l.weeks_left} week${l.weeks_left > 1 ? "s" : ""} until due`}
                    </span>
                  </td>
                  <td className="tabular py-2 text-right">{money(l.missing)}</td>
                  <td className="tabular py-2 text-right font-semibold">{money(l.this_week)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface p-3 text-[14px] text-ink-muted">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Steady gives estimates for personal planning. It isn't tax or legal advice. Adjust your reserves anytime.
      </p>
    </>
  );
}

function Personalize({ s }: { s: Summary }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [tax, setTax] = useState(s.tax_rate);
  const [cushion, setCushion] = useState<CushionLevel>(s.cushion_level);
  useEffect(() => {
    setTax(s.tax_rate);
    setCushion(s.cushion_level);
  }, [s.tax_rate, s.cushion_level]);

  const save = useMutation({
    mutationFn: () => api.saveSettings({ tax_rate: tax, cushion_level: cushion }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast("Preferences saved. Your numbers are updated.");
    },
  });
  const changed = tax !== s.tax_rate || cushion !== s.cushion_level;
  const income = s.breakdown.income;

  return (
    <section className="card mt-4 p-4" aria-labelledby="pers-h">
      <div className="flex items-center justify-between">
        <h2 id="pers-h" className="text-[18px] font-bold">
          Personalize your buffer
        </h2>
        <SlidersHorizontal size={20} className="text-teal" aria-hidden="true" />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <label htmlFor="tax-slider" className="text-[16px] font-semibold">
          Tax reserve
        </label>
        <span className="tabular text-[22px] font-bold">{pct(tax)}</span>
      </div>
      <input
        id="tax-slider"
        type="range"
        min={0.15}
        max={0.35}
        step={0.05}
        value={tax}
        onChange={(e) => setTax(Math.round(Number(e.target.value) * 100) / 100)}
        className="mt-2 w-full accent-[#0D5C58]"
        aria-valuetext={pct(tax)}
      />
      <div className="flex justify-between text-[13px] text-ink-muted" aria-hidden="true">
        <span>15%</span>
        <span>25%</span>
        <span>35%</span>
      </div>
      <p className="mt-2 flex items-start gap-2 rounded-xl bg-surface p-3 text-[14px]">
        <Info size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />
        20–25% is a common starting point for 1099 contractors.
      </p>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-[16px] font-semibold" id="cush-label">
          Cushion strength
        </p>
        <span className="tabular text-[15px] font-semibold text-mint-ink">
          {CUSHION_INFO[cushion].label} ({money(Math.round(income * CUSHION_RATES[cushion] * 100) / 100)} this week)
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-2xl bg-surface p-1.5" role="radiogroup" aria-labelledby="cush-label">
        {(Object.keys(CUSHION_INFO) as CushionLevel[]).map((k) => {
          const on = k === cushion;
          return (
            <button
              key={k}
              role="radio"
              aria-checked={on}
              onClick={() => setCushion(k)}
              className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl ${on ? "bg-white shadow" : "hover:bg-white/60"}`}
            >
              <span className="text-[15px] font-semibold">{CUSHION_INFO[k].label}</span>
              <span className="tabular text-[13px] text-ink-muted">{money(Math.round(income * CUSHION_RATES[k] * 100) / 100)}</span>
            </button>
          );
        })}
      </div>

      <button className="btn-primary mt-4 w-full" disabled={!changed || save.isPending} onClick={() => save.mutate()}>
        <CheckCircle2 size={20} aria-hidden="true" />
        {save.isPending ? "Saving…" : changed ? "Save preferences" : "Preferences saved"}
      </button>
    </section>
  );
}
