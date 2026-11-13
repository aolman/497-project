import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Info, Layers, LineChart, ShieldCheck, Sprout } from "lucide-react";
import { api, type CushionLevel } from "../api";
import { Pill } from "../components/ui";
import { CUSHION_INFO, money, pct } from "../format";
import { clearDraftName, readDraftName } from "../setupDraft";

const TAX_OPTIONS = [0.15, 0.2, 0.25, 0.3];
const CUSHION_RATES: Record<CushionLevel, number> = { light: 0.05, moderate: 0.1, strong: 0.15 };
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function SetupBuffer() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tax, setTax] = useState(0.2);
  const [cushion, setCushion] = useState<CushionLevel>("moderate");

  useEffect(() => {
    document.title = "Buffer setup · Steady";
  }, []);

  const finish = useMutation({
    mutationFn: async () => {
      await api.saveSettings({ tax_rate: tax, cushion_level: cushion, name: readDraftName() });
      return api.completeSetup();
    },
    onSuccess: async () => {
      clearDraftName();
      await qc.invalidateQueries();
      navigate("/", { replace: true });
    },
  });

  const sample = 100;
  const taxPart = round2(sample * tax);
  const cushionPart = round2(sample * CUSHION_RATES[cushion]);

  return (
    <>
      <header className="shrink-0 px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/setup/sources")} className="btn-soft min-h-[44px] px-3 text-[15px]">
            <ArrowLeft size={18} aria-hidden="true" /> Back
          </button>
          <Pill tone="neutral">Step 3 of 3</Pill>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
          <div className="h-full w-full rounded-full bg-teal" />
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
        <h1 className="text-[28px] font-bold leading-tight">Set your safety buffers</h1>
        <p className="mt-1 text-[16px] text-ink-muted">Two simple dials to keep your finances calm. Change them anytime.</p>

        <section className="card mt-5 p-4" aria-labelledby="tax-h">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-teal" aria-hidden="true">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 id="tax-h" className="text-[17px] font-bold">
                  Tax reserve
                </h2>
                <p className="text-[14px] text-ink-muted">Held back from every payment</p>
              </div>
            </div>
            <div className="text-right">
              <p className="tabular text-[28px] font-bold leading-none">{pct(tax)}</p>
              <p className="text-[13px] font-semibold text-mint-ink">{tax === 0.2 ? "Suggested" : "Your choice"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Tax reserve rate">
            {TAX_OPTIONS.map((r) => {
              const on = r === tax;
              return (
                <button
                  key={r}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTax(r)}
                  className={`min-h-[48px] rounded-xl text-[16px] font-semibold ${on ? "bg-teal text-white" : "bg-surface text-ink hover:bg-[#E3E8F8]"}`}
                >
                  {pct(r)}
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-surface p-3 text-[15px]">
            <strong>Why 20%?</strong> Independent workers pay about 15.3% self-employment tax plus income tax. Reserving
            20% protects you against surprise quarterly bills.
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
              <Info size={14} aria-hidden="true" /> Planning estimate, not tax advice
            </p>
          </div>
        </section>

        <section className="card mt-4 p-4" aria-labelledby="cushion-h">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-teal" aria-hidden="true">
              <Layers size={20} />
            </span>
            <div>
              <h2 id="cushion-h" className="text-[17px] font-bold">
                Slow-period cushion
              </h2>
              <p className="text-[14px] text-ink-muted">Smooths slow weeks and dry spells</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cushion strength">
            {(Object.keys(CUSHION_INFO) as CushionLevel[]).map((k) => {
              const on = cushion === k;
              return (
                <button
                  key={k}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCushion(k)}
                  className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl ${on ? "bg-teal text-white" : "bg-surface text-ink hover:bg-[#E3E8F8]"}`}
                >
                  <span className="text-[16px] font-semibold">{CUSHION_INFO[k].label}</span>
                  <span className={`text-[14px] ${on ? "text-white/90" : "text-ink-muted"}`}>{CUSHION_INFO[k].rate} of pay</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface p-3 text-[15px]">
            <Sprout size={18} className="mt-0.5 shrink-0 text-mint-ink" aria-hidden="true" />
            {CUSHION_INFO[cushion].blurb} It protects you against slow delivery shifts or late client invoices.
          </p>
        </section>

        <section className="mt-4 rounded-card bg-surface p-4" aria-labelledby="preview-h" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 id="preview-h" className="flex items-center gap-2 text-[15px] font-bold uppercase tracking-wide">
              <LineChart size={18} className="text-teal" aria-hidden="true" /> Live preview
            </h2>
            <Pill tone="neutral">On a $100 payout</Pill>
          </div>
          <dl className="tabular mt-3 space-y-1.5 text-[16px]">
            <div className="flex justify-between">
              <dt className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber" aria-hidden="true" /> Saved for taxes
              </dt>
              <dd>{money(taxPart)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-mint" aria-hidden="true" /> Added to cushion
              </dt>
              <dd className="text-mint-ink">{money(cushionPart)}</dd>
            </div>
            <div className="flex justify-between border-t border-surface-line pt-1.5 font-bold">
              <dt className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal" aria-hidden="true" /> Left to spend (before bills)
              </dt>
              <dd>{money(round2(sample - taxPart - cushionPart))}</dd>
            </div>
          </dl>
        </section>

        <div className="mt-6">
          {finish.isError && <p className="mb-3 text-[15px] text-amber-ink">{(finish.error as Error).message}</p>}
          <button className="btn-primary w-full text-[17px]" disabled={finish.isPending} onClick={() => finish.mutate()}>
            {finish.isPending ? "Saving…" : "Finish setup and enter Steady"} <ArrowRight size={20} aria-hidden="true" />
          </button>
          <p className="mt-2 text-center text-[14px] text-ink-muted">You can change these buffers anytime in Settings.</p>
        </div>
      </main>
    </>
  );
}
