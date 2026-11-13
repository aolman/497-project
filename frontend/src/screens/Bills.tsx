import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, PiggyBank, Plus, Receipt, Trash2 } from "lucide-react";
import { api, type Bill } from "../api";
import { ErrorState, Loading, Pill, SheetPage, useToast } from "../components/ui";
import { cleanAmount, dueLabel, money, todayIso } from "../format";
import { billIcon } from "./Home";

export default function Bills() {
  const q = useQuery({ queryKey: ["bills"], queryFn: api.bills });
  const [adding, setAdding] = useState(false);

  return (
    <SheetPage title="Bills" icon={<Receipt size={22} className="text-teal" aria-hidden="true" />} back>
      <p className="px-1 text-[16px] text-ink-muted">
        Steady saves a little toward each bill every week, so rent never lands on one bad week.
      </p>

      {adding ? (
        <AddBill onDone={() => setAdding(false)} />
      ) : (
        <button className="btn-primary mt-4 w-full" onClick={() => setAdding(true)}>
          <Plus size={20} aria-hidden="true" /> Add a bill
        </button>
      )}

      {q.isLoading && <Loading />}
      {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.data && q.data.length === 0 && !adding && (
        <p className="card mt-4 p-5 text-[15px] text-ink-muted">No bills yet. Add rent, phone, insurance or anything you pay on a schedule.</p>
      )}
      {q.data && q.data.length > 0 && (
        <ul className="mt-4 space-y-3">
          {q.data.map((b) => (
            <BillRow key={b.id} b={b} />
          ))}
        </ul>
      )}
    </SheetPage>
  );
}

function BillRow({ b }: { b: Bill }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<"pay" | "delete" | null>(null);
  const Icon = billIcon(b.name);
  const done = async (msg: string) => {
    setConfirm(null);
    await qc.invalidateQueries();
    toast(msg);
  };
  const pay = useMutation({ mutationFn: () => api.payBill(b.id), onSuccess: () => done(`Marked ${b.name} as paid.`) });
  const del = useMutation({ mutationFn: () => api.deleteBill(b.id), onSuccess: () => done(`Removed ${b.name}.`) });
  const funded = b.status === "funded";

  return (
    <li className="card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[17px] font-bold">{b.name}</p>
            <p className="tabular text-[17px] font-bold">{money(b.amount)}</p>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[14px] text-ink-muted">
            <span>{dueLabel(b.due_date)}</span>
            <span aria-hidden="true">·</span>
            <span>{b.repeat === "none" ? "One time" : b.repeat === "weekly" ? "Every week" : "Every month"}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
          <div className={`h-full rounded-full ${funded ? "bg-mint" : "bg-teal"}`} style={{ width: `${b.progress * 100}%` }} />
        </div>
        {funded ? (
          <Pill tone="good">
            <Check size={14} aria-hidden="true" /> Funded
          </Pill>
        ) : (
          <Pill tone="neutral">
            <PiggyBank size={14} aria-hidden="true" /> {money(b.reserved)} saved
          </Pill>
        )}
      </div>

      {confirm ? (
        <div className="mt-3 rounded-xl bg-amber-soft p-3 text-[15px] text-amber-ink">
          <p>
            {confirm === "pay"
              ? b.repeat === "none"
                ? `Mark ${b.name} as paid?`
                : `Mark ${b.name} as paid? The next one will be scheduled.`
              : `Remove ${b.name} from your bills?`}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              className="btn-primary flex-1"
              disabled={pay.isPending || del.isPending}
              onClick={() => (confirm === "pay" ? pay.mutate() : del.mutate())}
            >
              {confirm === "pay" ? "Yes, paid" : "Yes, remove"}
            </button>
            <button className="btn-soft flex-1" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button className="btn-soft flex-1" onClick={() => setConfirm("pay")}>
            <Check size={18} aria-hidden="true" /> Mark paid
          </button>
          <button className="btn-ghost w-12 !px-0" onClick={() => setConfirm("delete")} aria-label={`Remove ${b.name}`}>
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </li>
  );
}

function AddBill({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(todayIso());
  const [repeat, setRepeat] = useState<Bill["repeat"]>("monthly");
  const value = Number(amount) || 0;
  const save = useMutation({
    mutationFn: () => api.addBill({ name: name.trim(), amount: value, due_date: due, repeat }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast(`Added ${name.trim()}. Steady will save toward it each week.`);
      onDone();
    },
  });
  const ready = name.trim() && value > 0 && due;

  return (
    <form
      className="card mt-4 space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) save.mutate();
      }}
    >
      <h2 className="text-[17px] font-bold">New bill</h2>
      <div>
        <label htmlFor="bname" className="label">
          Name
        </label>
        <input id="bname" className="field" placeholder="e.g. Car insurance" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="bamount" className="label">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true">$</span>
            <input
              id="bamount"
              inputMode="decimal"
              className="field tabular pl-8"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(cleanAmount(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label htmlFor="bdue" className="label">
            Next due
          </label>
          <input id="bdue" type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="brepeat" className="label">
          Repeats
        </label>
        <select id="brepeat" className="field" value={repeat} onChange={(e) => setRepeat(e.target.value as Bill["repeat"])}>
          <option value="monthly">Every month</option>
          <option value="weekly">Every week</option>
          <option value="none">One time</option>
        </select>
      </div>
      {save.isError && <p className="text-[15px] text-amber-ink" role="alert">{(save.error as Error).message}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={!ready || save.isPending}>
          {save.isPending ? "Saving…" : "Save bill"}
        </button>
        <button type="button" className="btn-soft" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
