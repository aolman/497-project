import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Check, ChevronRight, HeartHandshake, HelpCircle, Home as HouseIcon, Layers, MinusCircle, PiggyBank, PlusCircle, ShieldCheck, Smartphone, Sprout, Zap } from "lucide-react";
import { api, type Bill, type Summary } from "../api";
import { ErrorState, EstimateTag, Loading, Notice, Pill, SourceIcon, TabPage } from "../components/ui";
import { dayLabel, dueLabel, money, pct, shortDate, weekRange, wholeMoney } from "../format";

export default function Home() {
  const q = useQuery({ queryKey: ["summary"], queryFn: api.summary });

  return (
    <TabPage title="Home">
      {q.isLoading && <Loading />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.data && <HomeBody s={q.data} />}
    </TabPage>
  );
}

function HomeBody({ s }: { s: Summary }) {
  const short = s.short_by > 0;
  const noIncome = s.breakdown.income === 0;
  const greeting = s.name ? `Hi ${s.name}` : "Hi there";

  return (
    <>
      <section className="flex items-start justify-between gap-3 px-1 pt-2">
        <div>
        <h1 className="flex items-center gap-2 text-[26px] font-bold">
          {greeting} <Sprout size={22} className="text-mint" aria-hidden="true" />
        </h1>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[15px] text-ink-muted">
          <span>Week of {weekRange(s.week_of, s.week_end)}</span>
          <span aria-hidden="true">·</span>
          {short ? (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-ink">
              <AlertTriangle size={15} aria-hidden="true" /> Tight week
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-mint-ink">
              <ShieldCheck size={15} aria-hidden="true" /> Buffer healthy
            </span>
          )}
        </p>
        </div>
        <Link
          to="/activity"
          aria-label="See this week's activity"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface text-teal hover:bg-[#E3E8F8]"
        >
          <CalendarDays size={22} aria-hidden="true" />
        </Link>
      </section>

      <SafeCard s={s} short={short} noIncome={noIncome} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/log/income" className="btn-primary whitespace-nowrap px-3">
          <PlusCircle size={20} aria-hidden="true" /> Log income
        </Link>
        <Link to="/log/expense" className="btn-soft whitespace-nowrap px-3">
          <MinusCircle size={20} aria-hidden="true" /> Log expense
        </Link>
      </div>

      <section className="mt-7" aria-labelledby="bills-h">
        <div className="flex items-center justify-between px-1">
          <h2 id="bills-h" className="text-[19px] font-bold">
            Upcoming fixed bills
          </h2>
          <Link to="/bills" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-semibold text-teal">
            All bills ({s.upcoming_bills.length}) <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {s.upcoming_bills.length === 0 ? (
          <div className="card mt-2 p-5 text-[15px] text-ink-muted">
            No bills yet. <Link to="/bills" className="font-semibold text-teal underline">Add rent, phone or insurance</Link> so
            Steady can save for them each week.
          </div>
        ) : (
          <ul className="-mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-2" aria-label="Upcoming bills">
            {s.upcoming_bills.map((b) => (
              <BillCard key={b.id} b={b} />
            ))}
          </ul>
        )}
      </section>

      {s.sources_this_week.length > 0 && <SourcesCard s={s} />}

      {!short && !noIncome && (
        <section className="mt-5 flex items-start gap-3 rounded-card bg-surface p-4" aria-label="Weekly check-in">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-ink" aria-hidden="true">
            <HeartHandshake size={22} />
          </span>
          <div>
            <h2 className="text-[16px] font-bold">You're doing great{s.name ? `, ${s.name}` : ""}</h2>
            <p className="mt-0.5 text-[15px] text-ink-muted">
              Your taxes and bills are set aside for this week. What's left is yours to use.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

function SourcesCard({ s }: { s: Summary }) {
  return (
    <section className="card mt-6 p-4" aria-labelledby="src-h">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="src-h" className="text-[19px] font-bold">
            Active sources this week
          </h2>
          <p className="text-[15px] text-ink-muted">
            {s.sources_this_week.length} platform{s.sources_this_week.length > 1 ? "s" : ""} paid you
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-teal" aria-hidden="true">
          <Layers size={18} />
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {s.sources_this_week.map((x) => (
          <li key={x.name} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
            <SourceIcon name={x.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold">{x.name}</p>
              <p className="text-[14px] text-ink-muted">
                {x.entries} {x.entries === 1 ? "payment" : "payments"} · last {/^(Today|Yesterday)$/.test(dayLabel(x.last_date)) ? dayLabel(x.last_date).toLowerCase() : shortDate(x.last_date)}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular text-[16px] font-bold text-mint-ink">+{money(x.total)}</p>
              <p className="tabular text-[13px] text-ink-muted">{Math.round(x.share * 100)}% of total</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[14px] text-ink-muted">All sources are combined into one weekly safe-to-spend figure.</p>
    </section>
  );
}

function SafeCard({ s, short, noIncome }: { s: Summary; short: boolean; noIncome: boolean }) {
  const b = s.breakdown;
  const safe = Math.max(s.safe_to_spend_exact, 0);
  const total = b.income || 1;
  const segments = [
    { key: "safe", value: safe, color: "bg-teal", label: "Safe to spend" },
    { key: "tax", value: b.tax_set_aside, color: "bg-amber", label: "Taxes" },
    { key: "cushion", value: b.cushion, color: "bg-mint", label: "Cushion" },
    { key: "bills", value: b.bills_reserve, color: "bg-bills", label: "Bills" },
    { key: "spent", value: b.spent, color: "bg-[#64748B]", label: "Spent" },
  ];

  return (
    <section className="card mt-4 bg-gradient-to-br from-white to-[#F1FBF8] p-5" aria-labelledby="safe-h">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="safe-h" className="text-[16px] font-semibold text-ink-muted">
              Safe to spend this week
            </h2>
            <EstimateTag />
          </div>
          {short ? (
            <p className="mt-2 text-[34px] font-bold leading-tight tabular">$0</p>
          ) : noIncome ? (
            <p className="mt-2 text-[34px] font-bold leading-tight tabular">$0</p>
          ) : (
            <p className="mt-2 leading-tight">
              <span className="block text-[15px] font-semibold text-ink-muted">About</span>
              <span className="tabular text-[34px] font-bold">
                {wholeMoney(s.range.low)} – {wholeMoney(s.range.high)}
              </span>
            </p>
          )}
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-ink">
          <Sprout size={24} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4">
        {noIncome && !short ? (
          <Notice tone="caution">No income logged this week yet. Log a payment to see what's safe to spend.</Notice>
        ) : short ? (
          <Notice tone="caution">
            <strong>Short by {money(s.short_by)} this week.</strong> Bills and taxes come first, so hold off on extras until
            more income comes in.
          </Notice>
        ) : (
          <Notice tone="good">All current bills and upcoming reserves are covered.</Notice>
        )}
      </div>

      {!noIncome && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[15px] font-semibold">Weekly earned flow</h3>
            <span className="tabular text-[15px] font-bold">{money(b.income)} total</span>
          </div>
          <div className="mt-2 flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden="true">
            {segments
              .filter((x) => x.value > 0)
              .map((x) => (
                <span key={x.key} className={`${x.color} h-full rounded-full`} style={{ width: `${(x.value / total) * 100}%` }} />
              ))}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Tile dot="bg-teal" label="Safe to spend" value={short ? `Short ${money(s.short_by)}` : `${money(safe)} exact`} />
            <Tile dot="bg-amber" label={`Taxes (${pct(s.tax_rate)})`} value={`${money(b.tax_set_aside)} set aside`} />
            <Tile dot="bg-mint" label={`Slow-week cushion (${pct(s.cushion_rate)})`} value={`${money(b.cushion)} saved`} />
            <Tile dot="bg-bills" label="Bills reserve" value={`${money(b.bills_reserve)} this week`} />
          </dl>
          {b.spent > 0 && (
            <p className="mt-2 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-[15px]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#64748B]" aria-hidden="true" />
              Already spent this week: <strong className="tabular">{money(b.spent)}</strong>
            </p>
          )}
        </div>
      )}

      <Link
        to="/explainer"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-teal underline-offset-2 hover:underline"
      >
        <HelpCircle size={18} aria-hidden="true" /> How is this calculated?
      </Link>
    </section>
  );
}

function Tile({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[14px] text-ink-muted">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="tabular mt-0.5 text-[15px] font-bold">{value}</dd>
    </div>
  );
}

export function billIcon(name: string) {
  const n = name.toLowerCase();
  if (/rent|apartment|mortgage|home/.test(n)) return HouseIcon;
  if (/phone|mobile|wireless/.test(n)) return Smartphone;
  if (/electric|gas|water|internet|wifi|utility/.test(n)) return Zap;
  return PiggyBank;
}

function BillCard({ b }: { b: Bill }) {
  const Icon = billIcon(b.name);
  const funded = b.status === "funded";
  return (
    <li className="card w-[210px] shrink-0 snap-start p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-soft text-teal">
          <Icon size={20} aria-hidden="true" />
        </span>
        {funded ? (
          <Pill tone="good">
            <Check size={14} aria-hidden="true" /> Funded
          </Pill>
        ) : (
          <Pill tone="neutral">
            <PiggyBank size={14} aria-hidden="true" /> In cushion
          </Pill>
        )}
      </div>
      <p className="tabular mt-3 text-[20px] font-bold">{money(b.amount)}</p>
      <p className="text-[15px] text-ink">{b.name}</p>
      <p className="text-[14px] text-ink-muted">{dueLabel(b.due_date)}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div className={`h-full rounded-full ${funded ? "bg-mint" : "bg-teal"}`} style={{ width: `${Math.min(b.progress, 1) * 100}%` }} />
      </div>
      <p className="tabular mt-1.5 text-[14px] text-ink-muted">
        {money(b.reserved)} of {money(b.amount)} set aside
      </p>
    </li>
  );
}
