import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Inbox, PlusCircle, Sparkles } from "lucide-react";
import { api } from "../api";
import { Pill, SourceIcon } from "../components/ui";

const SUGGESTED: { name: string; blurb: string }[] = [
  { name: "DoorDash", blurb: "Food delivery and dash batches" },
  { name: "Uber Eats", blurb: "Rideshare and courier deliveries" },
  { name: "Freelance", blurb: "Design, photography, consulting" },
  { name: "Lyft", blurb: "Rideshare driver payouts" },
  { name: "Instacart", blurb: "Grocery delivery" },
  { name: "Etsy / Resale", blurb: "Shop earnings and resale" },
  { name: "Rover / TaskRabbit", blurb: "Pet sitting, handyman and home tasks" },
];

export default function SetupSources() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ["sources"], queryFn: api.sources });
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);

  useEffect(() => {
    document.title = "Income sources · Steady";
  }, []);
  useEffect(() => {
    if (existing.data?.length) setPicked((p) => Array.from(new Set([...p, ...existing.data.map((s) => s.name)])));
  }, [existing.data]);

  const known = new Set(SUGGESTED.map((s) => s.name));
  const others = Array.from(new Set([...extra, ...(existing.data ?? []).map((s) => s.name)])).filter((n) => !known.has(n));
  const options = [...SUGGESTED, ...others.map((n) => ({ name: n, blurb: "Your own source" }))];
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const addCustom = () => {
    const n = custom.trim();
    if (!n) return;
    setExtra((e) => (e.includes(n) ? e : [...e, n]));
    setPicked((p) => (p.includes(n) ? p : [...p, n]));
    setCustom("");
    setShowCustom(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      const have = existing.data ?? [];
      for (const n of picked) if (!have.some((s) => s.name === n)) await api.addSource(n);
      for (const s of have) if (!picked.includes(s.name)) await api.deleteSource(s.id).catch(() => undefined);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sources"] });
      navigate("/setup/buffer");
    },
  });

  return (
    <>
      <header className="shrink-0 px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/welcome")} className="btn-soft min-h-[44px] px-3 text-[15px]">
            <ArrowLeft size={18} aria-hidden="true" /> Back
          </button>
          <span className="text-[14px] font-semibold uppercase tracking-wide text-ink-muted">Onboarding · Step 2 of 3</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
          <div className="h-full w-2/3 rounded-full bg-teal" />
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
        <div>
          <Pill tone="neutral">
            <Inbox size={14} aria-hidden="true" /> Income sources
          </Pill>
        </div>
        <h1 className="mt-2 text-[28px] font-bold leading-tight">Where do you earn money?</h1>
        <p className="mt-1 text-[16px] text-ink-muted">Select all that apply. You can add more later from Log income.</p>

        <ul className="mt-5 space-y-2.5" role="group" aria-label="Income sources">
          {options.map(({ name, blurb }) => {
            const on = picked.includes(name);
            return (
              <li key={name}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(name)}
                  className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border bg-white px-3 py-3 text-left ${
                    on ? "border-teal ring-1 ring-teal" : "border-surface-line hover:border-teal-line"
                  }`}
                >
                  <SourceIcon name={name} />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-[16px] font-bold">
                      {name} {on && <Pill tone="neutral">Active</Pill>}
                    </span>
                    <span className="block text-[14px] text-ink-muted">{blurb}</span>
                  </span>
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-lg border-2 ${on ? "border-teal bg-teal text-white" : "border-surface-line bg-surface"}`}
                    aria-hidden="true"
                  >
                    {on && <Check size={18} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {showCustom ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addCustom();
            }}
          >
            <label htmlFor="custom-source" className="sr-only">
              Custom source name
            </label>
            <input
              id="custom-source"
              autoFocus
              className="field"
              placeholder="e.g. Shipt, tutoring"
              maxLength={40}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={!custom.trim()}>
              Add
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="mt-3 flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left hover:bg-[#E3E8F8]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-teal" aria-hidden="true">
              <PlusCircle size={20} />
            </span>
            <span>
              <span className="block text-[16px] font-bold">Custom gig source</span>
              <span className="block text-[14px] text-ink-muted">Add any local or niche platform</span>
            </span>
          </button>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-surface p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-ink" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <p className="text-[15px]">
            <strong>
              {picked.length} source{picked.length === 1 ? "" : "s"} selected.
            </strong>{" "}
            <span className="text-ink-muted">Steady combines them into one weekly total and one safe-to-spend figure.</span>
          </p>
        </div>

        <div className="mt-6">
          {save.isError && <p className="mb-3 text-[15px] text-amber-ink">{(save.error as Error).message}</p>}
          <button className="btn-primary w-full text-[17px]" disabled={!picked.length || save.isPending} onClick={() => save.mutate()}>
            {picked.length ? "Continue to setup" : "Pick at least one source"} <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </main>
    </>
  );
}
