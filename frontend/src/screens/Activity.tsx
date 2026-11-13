import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Gamepad2, Home as HouseIcon, Landmark, MoreHorizontal, ShoppingCart, Smartphone, Trash2, Utensils, Waves, Zap } from "lucide-react";
import { api, type Activity, type ActivityItem, type Weeks } from "../api";
import { ErrorState, Loading, Pill, SourceIcon, TabPage, useToast } from "../components/ui";
import { capitalize, dayLabel, money, pct, shortDate, toIso, weekRange } from "../format";

type Filter = "all" | "income" | "expense";

const EXPENSE_ICONS: Record<string, typeof Car> = {
  gas: Car,
  dining: Utensils,
  groceries: ShoppingCart,
  phone: Smartphone,
  utilities: Zap,
  rent: HouseIcon,
  fun: Gamepad2,
  other: MoreHorizontal,
};
const EXPENSE_LABELS: Record<string, string> = { dining: "Food / meals", phone: "Phone & tech" };

function lastWeekIso() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return toIso(d);
}

export default function ActivityScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const now = useQuery({ queryKey: ["activity", "this"], queryFn: () => api.activity() });
  const prev = useQuery({ queryKey: ["activity", "last"], queryFn: () => api.activity(lastWeekIso()) });
  const weeks = useQuery({ queryKey: ["weeks"], queryFn: () => api.weeks(8) });

  const keep = (it: ActivityItem) => filter === "all" || it.kind === filter;

  return (
    <TabPage title="Activity">
      <div className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Show">
        {(
          [
            ["all", "All"],
            ["income", "Income only"],
            ["expense", "Expenses only"],
          ] as [Filter, string][]
        ).map(([v, label]) => (
          <button key={v} role="radio" aria-checked={filter === v} onClick={() => setFilter(v)} className={`${filter === v ? "chip-on" : "chip-off"} shrink-0`}>
            {label}
          </button>
        ))}
      </div>

      {now.isLoading && <Loading />}
      {now.isError && <ErrorState error={now.error} retry={() => now.refetch()} />}
      {now.data && (
        <>
          <CashFlow a={now.data} />
          <DayGroups items={now.data.items.filter(keep)} taxRate={now.data.tax_rate} />
        </>
      )}

      {prev.data && prev.data.items.length > 0 && (
        <section className="card mt-6 p-4" aria-labelledby="past-h">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Completed period</p>
              <h2 id="past-h" className="text-[18px] font-bold">
                Past week ({weekRange(prev.data.week_of, prev.data.week_end)})
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-ink-muted">Total earned</p>
              <p className="tabular text-[17px] font-bold text-mint-ink">+{money(prev.data.income)}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {prev.data.items.filter(keep).map((it) => (
              <Row key={`${it.kind}-${it.id}`} it={it} taxRate={prev.data.tax_rate} compact />
            ))}
          </ul>
        </section>
      )}

      {weeks.data && <History data={weeks.data} />}
    </TabPage>
  );
}

function CashFlow({ a }: { a: Activity }) {
  const left = a.income - a.spent - a.reserved;
  const total = Math.max(a.income, a.spent + a.reserved, 1);
  return (
    <section className="card mt-3 p-4" aria-labelledby="flow-h">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Weekly cash flow</p>
          <h1 id="flow-h" className="text-[20px] font-bold">
            This week ({weekRange(a.week_of, a.week_end)})
          </h1>
        </div>
        <Pill tone={left >= 0 ? "good" : "caution"}>
          <Waves size={14} aria-hidden="true" /> {left >= 0 ? "Smooth flow" : "Tight week"}
        </Pill>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-3">
        <div>
          <dt className="text-[14px] text-ink-muted">Earned</dt>
          <dd className="tabular text-[18px] font-bold text-mint-ink">+{money(a.income)}</dd>
        </div>
        <div>
          <dt className="text-[14px] text-ink-muted">Spent</dt>
          <dd className="tabular text-[18px] font-bold">−{money(a.spent)}</dd>
        </div>
        <div>
          <dt className="text-[14px] text-ink-muted">Reserved</dt>
          <dd className="tabular text-[18px] font-bold">−{money(a.reserved)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex h-2.5 gap-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <span className="h-full rounded-full bg-teal" style={{ width: `${(Math.max(left, 0) / total) * 100}%` }} />
        <span className="h-full rounded-full bg-amber" style={{ width: `${(a.spent / total) * 100}%` }} />
        <span className="h-full rounded-full bg-bills" style={{ width: `${(a.reserved / total) * 100}%` }} />
      </div>
      <p className="tabular mt-2 flex items-center justify-between text-[15px]">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal" aria-hidden="true" />
          {left >= 0 ? "Left after spending and reserves" : "Over after spending and reserves"}
        </span>
        <strong>{left >= 0 ? money(left) : `−${money(-left)}`}</strong>
      </p>
      <p className="tabular mt-1 text-[14px] text-ink-muted">
        Last week: earned {money(a.last_week_income)}, spent {money(a.last_week_spent)}
      </p>
    </section>
  );
}

function DayGroups({ items, taxRate }: { items: ActivityItem[]; taxRate: number }) {
  if (!items.length) return <p className="card mt-4 p-5 text-[15px] text-ink-muted">Nothing to show for this week yet.</p>;
  const days: Record<string, ActivityItem[]> = {};
  for (const it of items) (days[it.date] ??= []).push(it);
  return (
    <div className="mt-4 space-y-4">
      {Object.entries(days).map(([day, list]) => {
        const net = list.reduce((sum, it) => sum + (it.kind === "income" ? it.amount : -it.amount), 0);
        return (
          <section key={day} aria-label={dayLabel(day)}>
            <div className="flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 text-[16px] font-bold">
                {dayLabel(day) === "Today" ? `Today, ${shortDate(day)}` : dayLabel(day)}
                <Pill tone="neutral">
                  {list.length} item{list.length > 1 ? "s" : ""}
                </Pill>
              </h2>
              <span className={`tabular text-[15px] font-bold ${net >= 0 ? "text-mint-ink" : "text-ink"}`}>
                {net >= 0 ? "+" : "−"}
                {money(Math.abs(net))} net
              </span>
            </div>
            <ul className="mt-2 space-y-2">
              {list.map((it) => (
                <Row key={`${it.kind}-${it.id}`} it={it} taxRate={taxRate} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Row({ it, taxRate, compact = false }: { it: ActivityItem; taxRate: number; compact?: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const del = useMutation({
    mutationFn: () => api.deleteEntry(it.kind, it.id),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast(`Deleted ${money(it.amount)} ${it.kind}.`);
    },
  });
  const income = it.kind === "income";
  const title = income ? it.label : EXPENSE_LABELS[it.label] ?? capitalize(it.label);
  const Icon = EXPENSE_ICONS[it.label] ?? MoreHorizontal;

  return (
    <li className={compact ? "rounded-2xl bg-surface p-3" : "card p-3"}>
      <div className="flex items-center gap-3">
        {income ? (
          <SourceIcon name={it.label} />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-ink" aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold">{title}</p>
          <p className="flex items-center gap-1.5 truncate text-[14px] text-ink-muted">
            <Pill tone="neutral">{income ? "Income" : "Expense"}</Pill>
            {compact ? shortDate(it.date) : it.note}
          </p>
        </div>
        {compact ? (
          <span className={`tabular text-[16px] font-bold ${income ? "text-mint-ink" : "text-ink"}`}>
            {income ? "+" : "−"}
            {money(it.amount)}
          </span>
        ) : confirm ? (
          <div className="flex items-center gap-1">
            <button className="btn h-11 min-h-0 bg-amber-soft px-3 text-[14px] text-amber-ink" onClick={() => del.mutate()} disabled={del.isPending}>
              Delete
            </button>
            <button className="btn-ghost h-11 min-h-0 px-3 text-[14px]" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </div>
        ) : (
          <>
            <span className={`tabular text-[16px] font-bold ${income ? "text-mint-ink" : "text-ink"}`}>
              {income ? "+" : "−"}
              {money(it.amount)}
            </span>
            <button
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface"
              onClick={() => setConfirm(true)}
              aria-label={`Delete ${title} ${money(it.amount)}`}
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
      {income && !compact && it.tax_held !== undefined && (
        <p className="tabular mt-2 flex items-center justify-between rounded-xl bg-amber-soft/60 px-3 py-2 text-[14px] text-amber-ink">
          <span className="flex items-center gap-1.5">
            <Landmark size={15} aria-hidden="true" /> {pct(taxRate)} tax held
          </span>
          <strong>+{money(it.tax_held)} reserved</strong>
        </p>
      )}
    </li>
  );
}

function History({ data }: { data: Weeks }) {
  const max = Math.max(...data.weeks.map((w) => w.total), 1);
  const lowWeek = data.weeks.slice(0, -1).reduce((lo, w) => (w.total < lo.total ? w : lo), data.weeks[0]);
  return (
    <section className="card mt-6 p-4" aria-labelledby="hist-h">
      <h2 id="hist-h" className="text-[18px] font-bold">
        Income over 8 weeks
      </h2>
      <p className="mt-0.5 text-[15px] text-ink-muted">Spot your strongest and slowest weeks.</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(
          [
            ["Highest", data.highest],
            ["Average", data.average],
            ["Lowest", data.lowest],
          ] as [string, number][]
        ).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface px-2 py-2">
            <dt className="text-[14px] text-ink-muted">{k}</dt>
            <dd className="tabular text-[16px] font-bold">{money(v)}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 space-y-2" aria-label="Weekly income totals">
        {data.weeks.map((w, i) => {
          const isThis = i === data.weeks.length - 1;
          const isLow = !isThis && w.week_of === lowWeek.week_of;
          return (
            <li key={w.week_of} className="flex items-center gap-3 text-[14px]">
              <span className="w-[86px] shrink-0 text-ink-muted">{isThis ? "This week" : shortDate(w.week_of)}</span>
              <span className="h-5 flex-1 overflow-hidden rounded-md bg-surface" aria-hidden="true">
                <span
                  className={`block h-full rounded-md ${isLow ? "bg-amber" : isThis ? "bg-teal" : "bg-teal-line"}`}
                  style={{ width: `${(w.total / max) * 100}%` }}
                />
              </span>
              <span className="tabular w-[84px] shrink-0 text-right font-semibold">{money(w.total)}</span>
              {isLow && <span className="sr-only">slowest week</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[14px] text-ink-muted">
        Amber marks your slowest full week (week of {shortDate(lowWeek.week_of)}). This week only counts what you've logged so far.
      </p>
    </section>
  );
}
