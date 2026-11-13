import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Heart, Landmark, Layers, Sprout } from "lucide-react";
import { api } from "../api";
import { Logo, Pill } from "../components/ui";
import { readDraftName, saveDraftName } from "../setupDraft";

const FEATURES = [
  {
    icon: Sprout,
    title: "Safe to spend, not guesswork",
    tag: "Live",
    text: "Steady only counts money you've already earned. It never assumes future shifts.",
  },
  {
    icon: Landmark,
    title: "Tax reserve on autopilot",
    tag: "1099 ready",
    text: "A share of every payment is held for taxes, so quarterly bills don't catch you off guard.",
  },
  {
    icon: Layers,
    title: "Slow-week cushion",
    tag: "Adaptive",
    text: "Good weeks set a little aside, so slow weeks feel as steady as busy ones.",
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState(readDraftName());

  useEffect(() => {
    document.title = "Welcome · Steady";
  }, []);

  const demo = useMutation({
    mutationFn: () => api.reset("demo"),
    onSuccess: async () => {
      await qc.invalidateQueries();
      navigate("/");
    },
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-8 pt-[max(env(safe-area-inset-top),20px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="text-[20px] font-bold text-teal-dark">Steady</span>
        </div>
        <Pill tone="neutral">
          <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" /> Peace of mind
        </Pill>
      </div>

      <section className="mt-5 flex items-center gap-4 rounded-card bg-surface p-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-teal text-mint-soft" aria-hidden="true">
          <Sprout size={36} />
        </span>
        <div>
          <Pill tone="good">Zero judgment zone</Pill>
          <p className="mt-1.5 text-[17px] font-bold leading-snug">Predictable living with unpredictable pay.</p>
        </div>
      </section>

      <h1 className="mt-6 text-[30px] font-bold leading-tight">Budgeting built for irregular income.</h1>
      <p className="mt-2 text-[16px] text-ink-muted">
        Most budgets expect the same paycheck every two weeks. Steady works with how you actually earn: it smooths out slow
        weeks and takes the stress out of gig taxes.
      </p>

      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-[15px]">
        <Heart size={18} className="shrink-0 text-teal" aria-hidden="true" />
        Made for delivery couriers, freelancers, rideshare drivers and independent creators.
      </p>

      <ul className="mt-4 space-y-3">
        {FEATURES.map(({ icon: Icon, title, tag, text }) => (
          <li key={title} className="card flex gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-soft text-teal">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold">{title}</h2>
                <Pill tone="neutral">{tag}</Pill>
              </div>
              <p className="mt-1 text-[15px] text-ink-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          saveDraftName(name.trim());
          navigate("/setup/sources");
        }}
      >
        <label htmlFor="name" className="label">
          What should we call you? <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="name"
          className="field"
          placeholder="First name"
          autoComplete="given-name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn-primary mt-4 w-full text-[17px]">
          Get started <ArrowRight size={20} aria-hidden="true" />
        </button>
        <button type="button" className="btn-soft mt-2 w-full" onClick={() => demo.mutate()} disabled={demo.isPending}>
          {demo.isPending ? "Loading demo…" : "Explore with demo data"}
        </button>
        {demo.isError && <p className="mt-2 text-center text-[15px] text-amber-ink">{(demo.error as Error).message}</p>}
        <p className="mt-3 text-center text-[14px] text-ink-muted">Steady only uses what you enter. No bank login needed.</p>
      </form>
    </main>
  );
}
