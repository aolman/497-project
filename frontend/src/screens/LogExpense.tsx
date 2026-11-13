import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  Gamepad2,
  Home as HouseIcon,
  MoreHorizontal,
  NotebookPen,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Utensils,
  Zap,
} from "lucide-react";
import { api } from "../api";
import { AmountEntry, Keypad, Pill, SheetPage, useToast } from "../components/ui";
import { money, todayIso, wholeMoney } from "../format";

export const CATEGORIES = [
  { value: "gas", label: "Gas", icon: Car },
  { value: "dining", label: "Food / Meals", icon: Utensils },
  { value: "groceries", label: "Groceries", icon: ShoppingCart },
  { value: "phone", label: "Phone & Tech", icon: Smartphone },
  { value: "utilities", label: "Utilities", icon: Zap },
  { value: "rent", label: "Rent", icon: HouseIcon },
  { value: "fun", label: "Fun", icon: Gamepad2 },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

export default function LogExpense() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const summary = useQuery({ queryKey: ["summary"], queryFn: api.summary });
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [showPad, setShowPad] = useState(false);

  const value = Number(amount) || 0;
  const save = useMutation({
    mutationFn: () => api.logExpense({ amount: value, category: category!, date, note: note.trim() || undefined }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      const label = CATEGORIES.find((c) => c.value === category)?.label ?? "expense";
      toast(`Saved ${money(value)} for ${label}. Safe to spend is updated.`);
      navigate("/");
    },
  });

  const ready = value > 0 && category !== null && !!date;
  const missing = value <= 0 ? "Enter an amount" : category === null ? "Pick a category" : "";

  // Live "before → after" for this week's safe-to-spend (only when the expense is dated this week).
  const s = summary.data;
  const inThisWeek = s ? date >= s.week_of && date <= s.week_end : false;
  const before = s ? Math.max(s.safe_to_spend_exact, 0) : 0;
  const after = s ? s.safe_to_spend_exact - (inThisWeek ? value : 0) : 0;
  const weekIncome = s?.breakdown.income || 0;
  const usedShare = weekIncome ? Math.min(Math.max((weekIncome - Math.max(after, 0)) / weekIncome, 0), 1) : 1;

  return (
    <SheetPage
      title="Log expense"
      icon={<ReceiptText size={22} className="text-teal" aria-hidden="true" />}
      footer={
        <>
          {save.isError && <p className="mb-2 text-[15px] text-amber-ink" role="alert">{(save.error as Error).message}</p>}
          <button className="btn-primary w-full text-[17px]" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {ready && <Check size={20} aria-hidden="true" />}
            {save.isPending ? "Saving…" : ready ? `Save ${money(value)} expense` : missing}
          </button>
        </>
      }
    >
      <AmountEntry
        label="Expense amount"
        value={amount}
        onChange={setAmount}
        hint={
          category ? (
            <>
              <ReceiptText size={16} aria-hidden="true" /> {CATEGORIES.find((c) => c.value === category)?.label}
            </>
          ) : (
            "Type the amount you paid"
          )
        }
      />
      <button type="button" className="btn-ghost mt-1 min-h-[44px] w-full text-[15px]" onClick={() => setShowPad((v) => !v)}>
        {showPad ? "Hide number pad" : "Show number pad"}
      </button>
      {showPad && (
        <div className="mt-1">
          <Keypad value={amount} onChange={setAmount} />
        </div>
      )}

      <section className="mt-4" aria-labelledby="cat-h">
        <div className="flex items-baseline justify-between">
          <h2 id="cat-h" className="label">
            Category
          </h2>
          <span className="text-[14px] text-ink-muted">1-tap select</span>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cat-h">
          {CATEGORIES.map(({ value: v, label, icon: Icon }) => {
            const on = v === category;
            return (
              <button key={v} role="radio" aria-checked={on} onClick={() => setCategory(v)} className={on ? "chip-on" : "chip-off"}>
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 space-y-3">
        <div className="relative">
          <label htmlFor="date" className="absolute left-12 top-2 text-[13px] font-semibold text-ink-muted">
            Date
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
            Memo / note <span className="font-normal">(optional)</span>
          </label>
          <NotebookPen size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-teal" aria-hidden="true" />
          <input
            id="note"
            className="field min-h-[60px] pb-2 pl-12 pt-6"
            placeholder="e.g. Shell station, delivery shift"
            maxLength={120}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {s && (
        <section className="mt-4 rounded-card bg-surface p-4" aria-labelledby="buf-h" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <h2 id="buf-h" className="flex items-center gap-2 text-[16px] font-bold">
              <ShieldCheck size={20} className="text-teal" aria-hidden="true" /> Safe-to-spend this week
            </h2>
            {after >= 0 ? <Pill tone="good">Safe zone</Pill> : <Pill tone="caution">Over by {money(-after)}</Pill>}
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
            <span className="h-full bg-teal" style={{ width: `${(1 - usedShare) * 100}%` }} />
            <span className="h-full bg-amber/70" style={{ width: `${usedShare * 100}%` }} />
          </div>
          <p className="tabular mt-2 flex items-center gap-1.5 text-[15px]">
            {value > 0 && inThisWeek ? (
              <>
                Changes from about <strong>{wholeMoney(before)}</strong> <ArrowRight size={15} aria-hidden="true" />
                <strong>{wholeMoney(Math.max(after, 0))}</strong>
              </>
            ) : value > 0 ? (
              "This date is outside this week, so this week's number won't change."
            ) : (
              <>
                About <strong>{wholeMoney(before)}</strong> left to spend this week
              </>
            )}
          </p>
        </section>
      )}
    </SheetPage>
  );
}
