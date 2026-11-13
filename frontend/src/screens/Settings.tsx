import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flag, FlaskConical, Info, Landmark, PieChart, PiggyBank, Receipt, Shield, SlidersHorizontal, TrendingUp, User, Users } from "lucide-react";
import { api, type CushionLevel } from "../api";
import { ErrorState, Loading, Pill, Segmented, SourceIcon, TabPage, useToast } from "../components/ui";
import { CUSHION_INFO, dayLabel, money, pct } from "../format";

export default function SettingsScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const tax = useQuery({ queryKey: ["tax"], queryFn: api.tax });
  const sources = useQuery({ queryKey: ["sources"], queryFn: api.sources });
  const [name, setName] = useState("");

  useEffect(() => {
    if (settings.data) setName(settings.data.name);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (body: { tax_rate: number; cushion_level: CushionLevel; name?: string }) => api.saveSettings(body),
    onSuccess: async (_d, body) => {
      await qc.invalidateQueries();
      if (body.name !== undefined) toast("Name saved.");
      else toast(`Saved. Taxes ${pct(body.tax_rate)}, cushion ${CUSHION_INFO[body.cushion_level].label}.`);
    },
  });

  if (settings.isLoading || tax.isLoading) {
    return (
      <TabPage title="Settings">
        <Loading />
      </TabPage>
    );
  }
  if (settings.isError || tax.isError) {
    return (
      <TabPage title="Settings">
        <ErrorState error={settings.error ?? tax.error} retry={() => (settings.refetch(), tax.refetch())} />
      </TabPage>
    );
  }
  const s = settings.data!;
  const t = tax.data!;

  return (
    <TabPage title="Settings">
      <section className="flex items-center justify-between gap-2 px-1 pt-2">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-teal">
            <Shield size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-bold leading-tight">
              Tax reserve <Pill tone="good">Auto-stash on</Pill>
            </h1>
            <p className="text-[15px] text-ink-muted">Held back from every payment you log</p>
          </div>
        </div>
      </section>

      <section className="card mt-4 bg-gradient-to-br from-white to-[#F1FBF8] p-5" aria-labelledby="q-h">
        <div className="flex items-center justify-between gap-2">
          <h2 id="q-h" className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-teal" aria-hidden="true" />
            Q{t.quarter} estimated set-aside ({t.quarter_label})
          </h2>
          <Pill tone="good">{pct(t.tax_rate)} split</Pill>
        </div>
        <p className="mt-1">
          <span className="tabular text-[34px] font-bold">{money(t.quarter_set_aside)}</span>{" "}
          <span className="text-[16px] text-ink-muted">reserved</span>
        </p>
        <p className="tabular flex items-center gap-1.5 text-[15px] text-ink-muted">
          <TrendingUp size={16} aria-hidden="true" /> About {money(t.quarter_projection)} by quarter end at your current pace
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
          <div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(t.quarter_progress, 1) * 100}%` }} />
        </div>
        <div className="tabular mt-1 flex justify-between text-[13px] text-ink-muted">
          <span>Set aside so far ({Math.round(t.quarter_progress * 100)}%)</span>
          <span>Estimate: {money(t.quarter_projection)}</span>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-[15px]">
          <CheckCircle2 size={18} className="shrink-0 text-mint-ink" aria-hidden="true" />
          <span className="flex-1">
            {t.year} so far: <strong className="tabular">{money(t.ytd_set_aside)}</strong> set aside
          </span>
          <span className="flex items-center gap-1 text-[14px] text-ink-muted">
            <Users size={14} aria-hidden="true" /> {sources.data?.length ?? 0} sources
          </span>
        </div>
      </section>

      <TaxSplit rate={s.tax_rate} onSave={(r) => save.mutate({ tax_rate: r, cushion_level: s.cushion_level })} saving={save.isPending} />

      <section className="card mt-4 p-4" aria-labelledby="cush-h">
        <h2 id="cush-h" className="flex items-center gap-2 text-[17px] font-bold">
          <PiggyBank size={20} className="text-teal" aria-hidden="true" /> Slow-week cushion
        </h2>
        <p className="mb-3 mt-0.5 text-[15px] text-ink-muted">How much of each week to save for slower weeks.</p>
        <Segmented
          label="Cushion strength"
          value={s.cushion_level}
          onChange={(v) => save.mutate({ tax_rate: s.tax_rate, cushion_level: v })}
          options={(Object.keys(CUSHION_INFO) as CushionLevel[]).map((k) => ({ value: k, title: CUSHION_INFO[k].label, sub: CUSHION_INFO[k].rate }))}
        />
        <p className="mt-2 text-[15px] text-ink-muted">{CUSHION_INFO[s.cushion_level].blurb}</p>
      </section>

      {t.self_employment_reminder && (
        <section className="card mt-4 p-4" aria-labelledby="se-h">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-mint-ink">
              <Flag size={20} aria-hidden="true" />
            </span>
            <div>
              <Pill tone="neutral">IRS 1099 threshold reminder</Pill>
              <h2 id="se-h" className="mt-1.5 text-[16px] font-bold">
                Self-employment milestone reached
              </h2>
              <p className="mt-1 text-[15px] text-ink-muted">
                You've earned over $400 from gig work this year. Above $400 in net earnings, self-employment tax usually
                applies. Your set-aside keeps you ahead of it.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="card mt-4 p-4" aria-labelledby="makeup-h">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="makeup-h" className="text-[17px] font-bold">
              What makes up this {pct(s.tax_rate)}?
            </h2>
            <p className="text-[14px] text-ink-muted">Simple withholding for non-traditional income</p>
          </div>
          <PieChart size={20} className="text-teal" aria-hidden="true" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-surface p-3">
            <p className="tabular text-[20px] font-bold">15.3%</p>
            <p className="text-[15px] font-semibold">Self-employment tax</p>
            <p className="text-[14px] text-ink-muted">Social Security (12.4%) and Medicare (2.9%), which employers usually split with you.</p>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <p className="tabular text-[20px] font-bold">{s.tax_rate > 0.153 ? `~${(s.tax_rate * 100 - 15.3).toFixed(1)}%` : "0%"}</p>
            <p className="text-[15px] font-semibold">Income tax cushion</p>
            <p className="text-[14px] text-ink-muted">A buffer toward federal and state income tax. Your real amount depends on your bracket and deductions.</p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[14px] text-ink-muted">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          W-2 jobs withhold this from paychecks. For 1099 work, Steady holds it back from each payment you log.
        </p>
      </section>

      {t.recent.length > 0 && (
        <section className="card mt-4 p-4" aria-labelledby="stash-h">
          <div className="flex items-center justify-between">
            <h2 id="stash-h" className="text-[17px] font-bold">
              Recent tax stashes
            </h2>
            <span className="text-[13px] font-semibold text-mint-ink">Up to date</span>
          </div>
          <ul className="mt-3 space-y-2">
            {t.recent.map((r, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
                <SourceIcon name={r.source} size={36} />
                <div className="flex-1">
                  <p className="text-[15px] font-bold">{r.source}</p>
                  <p className="tabular text-[13px] text-ink-muted">
                    {dayLabel(r.date)} · {money(r.amount)} payment
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-[15px] font-bold text-mint-ink">+{money(r.set_aside)}</p>
                  <p className="text-[13px] text-ink-muted">Set aside</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mt-4 p-4" aria-labelledby="me-h">
        <h2 id="me-h" className="flex items-center gap-2 text-[17px] font-bold">
          <User size={20} className="text-teal" aria-hidden="true" /> Profile and sources
        </h2>
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ tax_rate: s.tax_rate, cushion_level: s.cushion_level, name: name.trim() });
          }}
        >
          <div className="flex-1">
            <label htmlFor="pname" className="label">
              Your name
            </label>
            <input id="pname" className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn-soft" disabled={name.trim() === s.name}>
            Save
          </button>
        </form>
        <p className="label mt-4">Income sources</p>
        <div className="flex flex-wrap gap-2">
          {sources.data?.map((src) => (
            <span key={src.id} className="chip-off cursor-default">
              {src.name}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[14px] text-ink-muted">Add a new source any time from Log income.</p>
        <Link to="/bills" className="btn-soft mt-4 w-full">
          <Receipt size={18} aria-hidden="true" /> Manage bills
        </Link>
      </section>

      <TestingTools />
    </TabPage>
  );
}

/** For peer-review sessions: put the app back in a known state between testers. */
function TestingTools() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState<"demo" | "empty" | null>(null);
  const reset = useMutation({
    mutationFn: (mode: "demo" | "empty") => api.reset(mode),
    onSuccess: async (_d, mode) => {
      setConfirm(null);
      await qc.invalidateQueries();
      if (mode === "empty") navigate("/welcome");
      else {
        toast("Demo data loaded.");
        navigate("/");
      }
    },
  });
  return (
    <section className="mt-6 rounded-card border border-dashed border-surface-line p-4" aria-labelledby="test-h">
      <h2 id="test-h" className="flex items-center gap-2 text-[16px] font-bold text-ink-muted">
        <FlaskConical size={18} aria-hidden="true" /> For test sessions
      </h2>
      <p className="mt-1 text-[14px] text-ink-muted">Resets every entry, bill and setting.</p>
      {confirm ? (
        <div className="mt-3 rounded-xl bg-amber-soft p-3 text-[15px] text-amber-ink">
          <p>
            {confirm === "demo" ? "Replace everything with Maya's demo week?" : "Erase everything and start setup from Welcome?"}
          </p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary flex-1" onClick={() => reset.mutate(confirm)} disabled={reset.isPending}>
              {reset.isPending ? "Resetting…" : "Yes, reset"}
            </button>
            <button className="btn-soft flex-1" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="btn-soft text-[15px]" onClick={() => setConfirm("demo")}>
            Load demo week
          </button>
          <button className="btn-soft text-[15px]" onClick={() => setConfirm("empty")}>
            Start fresh
          </button>
        </div>
      )}
    </section>
  );
}

function TaxSplit({ rate, onSave, saving }: { rate: number; onSave: (r: number) => void; saving: boolean }) {
  const [value, setValue] = useState(rate);
  useEffect(() => setValue(rate), [rate]);
  const label = value <= 0.15 ? "Lower" : value <= 0.2 ? "Suggested" : value >= 0.35 ? "Highest" : "Higher";
  return (
    <section className="card mt-4 p-4" aria-labelledby="rate-h">
      <div className="flex items-center justify-between">
        <h2 id="rate-h" className="flex items-center gap-2 text-[17px] font-bold">
          <SlidersHorizontal size={20} className="text-teal" aria-hidden="true" /> Tax set-aside rate
        </h2>
        <span className="tabular text-[22px] font-bold">{pct(value)}</span>
      </div>
      <p className="mt-0.5 text-[15px] text-ink-muted">A higher rate means more saved for taxes and less to spend now.</p>
      <label htmlFor="rate-slider" className="sr-only">
        Tax set-aside rate
      </label>
      <input
        id="rate-slider"
        type="range"
        min={0.15}
        max={0.35}
        step={0.05}
        value={value}
        onChange={(e) => setValue(Math.round(Number(e.target.value) * 100) / 100)}
        className="mt-3 w-full accent-[#0D5C58]"
        aria-valuetext={`${pct(value)}, ${label}`}
      />
      <div className="flex justify-between text-[13px] text-ink-muted" aria-hidden="true">
        <span>15% · Lower</span>
        <span>20% · Suggested</span>
        <span>35% · Highest</span>
      </div>
      <button className="btn-primary mt-4 w-full" disabled={value === rate || saving} onClick={() => onSave(value)}>
        <Landmark size={18} aria-hidden="true" />
        {saving ? "Saving…" : value === rate ? `Tax reserve set to ${pct(rate)}` : `Set tax reserve to ${pct(value)}`}
      </button>
    </section>
  );
}
