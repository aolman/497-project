import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, CheckCircle2, PencilLine, PlusCircle, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { AmountEntry, Keypad, Pill, SheetPage, SourceIcon, useToast } from "../components/ui";
import { money, pct, todayIso } from "../format";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function LogIncome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const sources = useQuery({ queryKey: ["sources"], queryFn: api.sources });
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });

  const [amount, setAmount] = useState("");
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [newSource, setNewSource] = useState("");
  const [adding, setAdding] = useState(false);

  const value = Number(amount) || 0;
  const debounced = useDebounced(value, 150);
  const preview = useQuery({
    queryKey: ["preview", debounced, settings.data?.tax_rate, settings.data?.cushion_level],
    queryFn: () => api.preview(debounced),
    enabled: debounced > 0,
  });
  const split = value > 0 && preview.data && preview.data.amount === value ? preview.data : null;

  const addSource = useMutation({
    mutationFn: (name: string) => api.addSource(name),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      setSourceId(s.id);
      setNewSource("");
      setAdding(false);
    },
  });

  const save = useMutation({
    mutationFn: () =>
      api.logIncome({ source_id: sourceId!, amount: value, date_earned: date, note: note.trim() || undefined }),
    onSuccess: async () => {
      const src = sources.data?.find((s) => s.id === sourceId)?.name ?? "income";
      await qc.invalidateQueries();
      toast(`Saved ${money(value)} from ${src}. Safe to spend is updated.`);
      navigate("/");
    },
  });

  const ready = value > 0 && sourceId !== null && !!date;
  const missing = value <= 0 ? "Enter an amount" : sourceId === null ? "Pick where it came from" : "";

  return (
    <SheetPage
      title="Log income"
      icon={<PlusCircle size={22} className="text-teal" aria-hidden="true" />}
      footer={
        <>
          {save.isError && <p className="mb-2 text-[15px] text-amber-ink" role="alert">{(save.error as Error).message}</p>}
          <button className="btn-primary w-full text-[17px]" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : ready ? `Save ${money(value)} income` : missing}
          </button>
        </>
      }
    >
      <AmountEntry
        label="Earned amount"
        value={amount}
        onChange={setAmount}
        hint={
          value > 0 ? (
            <>
              <CheckCircle2 size={16} className="text-mint-ink" aria-hidden="true" /> Ready to allocate safely
            </>
          ) : (
            "Type or tap the amount you were paid"
          )
        }
      />

      <section className="mt-5" aria-labelledby="src-h">
        <div className="flex items-baseline justify-between">
          <h2 id="src-h" className="label">
            Gig or client source
          </h2>
          <span className="text-[14px] text-ink-muted">1-tap select</span>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-labelledby="src-h">
          {sources.data?.map((s) => {
            const on = s.id === sourceId;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={on}
                onClick={() => setSourceId(s.id)}
                className={`${on ? "chip-on" : "chip-off"} shrink-0 pl-1.5`}
              >
                {on ? (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20" aria-hidden="true">
                    <Check size={18} />
                  </span>
                ) : (
                  <SourceIcon name={s.name} size={32} />
                )}
                {s.name}
              </button>
            );
          })}
          {!adding && (
            <button className="chip-off shrink-0 border-dashed text-teal-dark" onClick={() => setAdding(true)}>
              + New source
            </button>
          )}
        </div>
        {adding && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newSource.trim()) addSource.mutate(newSource.trim());
            }}
          >
            <label htmlFor="new-source" className="sr-only">
              New source name
            </label>
            <input
              id="new-source"
              autoFocus
              className="field"
              placeholder="e.g. Instacart"
              maxLength={40}
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
            />
            <button type="submit" className="btn-soft shrink-0" disabled={!newSource.trim() || addSource.isPending}>
              Add
            </button>
          </form>
        )}
      </section>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <label htmlFor="date" className="absolute left-12 top-2 text-[13px] font-semibold text-ink-muted">
            Date earned
          </label>
          <CalendarDays size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-teal" aria-hidden="true" />
          <input
            id="date"
            type="date"
            className="field min-h-[60px] pb-2 pl-12 pt-6 font-semibold"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="relative">
          <label htmlFor="note" className="absolute left-12 top-2 text-[13px] font-semibold text-ink-muted">
            Quick tag <span className="font-normal">(optional)</span>
          </label>
          <PencilLine size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-teal" aria-hidden="true" />
          <input
            id="note"
            className="field min-h-[60px] pb-2 pl-12 pt-6"
            placeholder="e.g. Lunch rush delivery"
            maxLength={120}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <section className="mt-4 rounded-card bg-surface p-4" aria-labelledby="split-h" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <h2 id="split-h" className="flex items-center gap-2 text-[16px] font-bold">
            <ShieldCheck size={20} className="text-teal" aria-hidden="true" />
            {split ? `From this ${money(split.amount)} entry` : "How this entry will split"}
          </h2>
          <Pill tone="good">Automatic</Pill>
        </div>
        {split && settings.data ? (
          <ul className="mt-3 space-y-2 text-[15px]">
            <SplitRow dot="bg-amber" label={`Reserved for taxes (${pct(settings.data.tax_rate)})`} value={split.tax} />
            <SplitRow dot="bg-mint" label={`Added to slow-week cushion (${pct(settings.data.cushion_rate)})`} value={split.cushion} />
            <SplitRow dot="bg-teal" label="Toward safe to spend" value={split.toward_spending} strong />
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-ink-muted">Enter an amount to see how much goes to taxes, your cushion and spending.</p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[14px] text-ink-muted">
          <CheckCircle2 size={15} aria-hidden="true" /> Keeps you ahead of tax bills automatically.
        </p>
      </section>

      <div className="mt-4">
        <Keypad value={amount} onChange={setAmount} />
      </div>
    </SheetPage>
  );
}

function SplitRow({ dot, label, value, strong = false }: { dot: string; label: string; value: number; strong?: boolean }) {
  return (
    <li className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${strong ? "bg-mint-soft" : "bg-white"}`}>
      <span className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </span>
      <span className={`tabular ${strong ? "font-bold text-teal-dark" : "font-semibold"}`}>{money(value)}</span>
    </li>
  );
}
