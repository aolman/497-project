import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Delete,
  Home as HomeIcon,
  Loader2,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { api } from "../api";
import { Bike, Briefcase, Car, PawPrint, ShoppingBasket, ShoppingCart, Store, Wallet } from "lucide-react";

// ---------- brand ----------

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0E5C58" />
      <path d="M8 21c4-1 6-4 8-9 2 5 4 8 8 9" fill="none" stroke="#D5F7E8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M7 24h18" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Avatar() {
  const { data } = useQuery({ queryKey: ["status"], queryFn: api.status });
  const initial = (data?.name || "S").trim().charAt(0).toUpperCase() || "S";
  return (
    <Link
      to="/settings"
      aria-label="Your profile and settings"
      className="grid h-11 w-11 place-items-center rounded-full bg-teal-soft font-semibold text-teal-dark"
    >
      {initial}
    </Link>
  );
}

/** Top bar: "Steady / Home" with the profile button. */
export function AppHeader({ title }: { title: string }) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-transparent bg-surface-page px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
      <Link to="/" className="flex items-center gap-2.5" aria-label="Steady home">
        <Logo />
        <span className="text-[17px] font-semibold text-teal-dark">Steady</span>
        <span className="text-ink-muted" aria-hidden="true">/</span>
        <span className="text-[17px] font-semibold">{title}</span>
      </Link>
      <Avatar />
    </header>
  );
}

// ---------- layout ----------

const TABS = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/activity", label: "Activity", icon: ActivityIcon, end: false },
  { to: "/plan", label: "Plan", icon: CalendarRange, end: false },
  { to: "/settings", label: "Settings", icon: SettingsIcon, end: false },
];

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="grid shrink-0 grid-cols-4 border-t border-surface-line bg-white px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2"
    >
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-[13px] font-semibold ${
              isActive ? "bg-teal-soft text-teal-dark" : "text-ink-muted hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** App frame: full screen on phones; a phone-sized frame centered on wider screens.
 *  The frame never scrolls itself: each screen pins its header and bottom bar and scrolls the middle. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] bg-surface-page sm:grid sm:place-items-center sm:bg-[#E7ECF5] sm:p-6">
      <div className="flex h-full w-full flex-col overflow-hidden bg-surface-page sm:h-[min(900px,calc(100dvh-48px))] sm:max-w-[430px] sm:rounded-[32px] sm:shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
        {children}
      </div>
    </div>
  );
}

/** The scrolling middle of a screen. */
export function Scroll({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${className}`}>{children}</main>;
}

/** Main screens: header on top, tab bar at the bottom. */
export function TabPage({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Steady`;
  }, [title]);
  return (
    <>
      <AppHeader title={title} />
      <Scroll className="px-4 pb-6">{children}</Scroll>
      <TabBar />
    </>
  );
}

/** Task screens (Log income, Log expense...): a sheet with a close button that returns Home. */
export function SheetPage({
  title,
  icon,
  children,
  footer,
  back = false,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  back?: boolean;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = `${title} · Steady`;
  }, [title]);
  return (
    <>
      <header className="flex shrink-0 items-center justify-between bg-surface-page px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        {back ? (
          <button onClick={() => navigate(-1)} className="btn-ghost h-11 w-11 !px-0" aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
        ) : (
          <span className="w-11" />
        )}
        <h1 className="flex items-center gap-2 text-[19px] font-bold">
          {icon}
          {title}
        </h1>
        <button
          onClick={() => navigate("/")}
          className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink hover:bg-[#E2E8F7]"
          aria-label="Close and go to Home"
        >
          <X size={22} />
        </button>
      </header>
      <Scroll className="px-4 pb-6">{children}</Scroll>
      {footer && (
        <div className="shrink-0 border-t border-surface-line bg-white px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          {footer}
        </div>
      )}
    </>
  );
}

// ---------- small pieces ----------

export function EstimateTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2.5 py-1 text-[13px] font-bold uppercase tracking-wide text-amber-ink">
      ≈ Estimate
    </span>
  );
}

export function Pill({ tone, children }: { tone: "good" | "caution" | "neutral"; children: ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-mint-soft text-mint-ink"
      : tone === "caution"
        ? "bg-amber-soft text-amber-ink"
        : "bg-surface text-ink-muted";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export function Notice({ tone, children }: { tone: "good" | "caution"; children: ReactNode }) {
  const good = tone === "good";
  const Icon = good ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-[15px] ${
        good ? "bg-mint-soft/70 text-[#064E3B]" : "bg-amber-soft text-amber-ink"
      }`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-muted" role="status">
      <Loader2 className="animate-spin" size={22} aria-hidden="true" />
      {label}…
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="card mt-4 p-5" role="alert">
      <Notice tone="caution">{message}</Notice>
      {retry && (
        <button className="btn-soft mt-4 w-full" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; title: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 rounded-2xl bg-surface p-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl px-2 py-2 text-center transition-colors ${
              on ? "bg-teal text-white shadow" : "text-ink hover:bg-white"
            }`}
          >
            <span className="text-[15px] font-semibold leading-tight">{o.title}</span>
            {o.sub && (
              <span className={`tabular text-[14px] leading-tight ${on ? "text-white/90" : "text-ink-muted"}`}>{o.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Large amount display. Typing on a keyboard works; pair it with <Keypad> for tapping. */
export function AmountEntry({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-card bg-surface p-4">
      <label htmlFor="amount" className="block text-center text-[14px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </label>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="text-[30px] font-bold text-ink-muted" aria-hidden="true">$</span>
        <input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            const dot = raw.indexOf(".");
            const s = dot === -1 ? raw : raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, "").slice(0, 2);
            onChange(s.slice(0, 9));
          }}
          style={{ width: `${Math.max(value.length || 4, 2) + 0.5}ch` }}
          className="tabular max-w-[260px] bg-transparent text-left text-[42px] font-bold leading-tight text-ink placeholder:text-[#94A3B8] focus:outline-none"
          aria-describedby="amount-hint"
        />
      </div>
      <div id="amount-hint" className="mt-1 flex min-h-[24px] flex-wrap items-center justify-center gap-x-1.5 text-center text-[15px] text-ink-muted">
        {hint}
      </div>
    </div>
  );
}

/** On-screen number pad for the amount field. */
export function Keypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (key: string) => {
    let next = value;
    if (key === "back") next = value.slice(0, -1);
    else if (key === ".") next = value.includes(".") ? value : (value || "0") + ".";
    else {
      const [, dec] = value.split(".");
      if (dec !== undefined && dec.length >= 2) return;
      next = value === "0" ? key : value + key;
    }
    if (next.replace(".", "").length > 7) return;
    onChange(next);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Number pad" role="group">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          aria-label={k === "back" ? "Delete last digit" : k === "." ? "Decimal point" : k}
          className="tabular grid h-12 place-items-center rounded-xl border border-surface-line bg-white text-[20px] font-semibold text-ink hover:bg-surface active:bg-teal-soft"
        >
          {k === "back" ? <Delete size={22} aria-hidden="true" /> : k}
        </button>
      ))}
    </div>
  );
}

// ---------- toast ----------

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        {msg && (
          <div className="pointer-events-auto flex max-w-[400px] items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-[15px] font-medium text-white shadow-lg">
            <CheckCircle2 size={20} className="shrink-0 text-mint" aria-hidden="true" />
            {msg}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ---------- income source icons ----------


const SOURCE_STYLES: { test: RegExp; icon: typeof Car; bg: string; fg: string; blurb: string }[] = [
  { test: /doordash|grubhub|postmates/i, icon: Bike, bg: "bg-[#FDE7E4]", fg: "text-[#B42318]", blurb: "Food delivery" },
  { test: /uber|lyft|rideshare|taxi/i, icon: Car, bg: "bg-[#E4E7F2]", fg: "text-[#1E293B]", blurb: "Rideshare and courier" },
  { test: /instacart|shipt/i, icon: ShoppingCart, bg: "bg-[#DDF5E6]", fg: "text-[#046C4E]", blurb: "Grocery delivery" },
  { test: /freelance|client|design|photo|consult|direct/i, icon: Briefcase, bg: "bg-[#DDEFEC]", fg: "text-[#0D5C58]", blurb: "Clients and invoices" },
  { test: /etsy|ebay|resale|shop|amazon/i, icon: Store, bg: "bg-[#FDF0D5]", fg: "text-[#8A3B06]", blurb: "Shop and resale" },
  { test: /rover|taskrabbit|pet|tutor/i, icon: PawPrint, bg: "bg-[#ECE7FB]", fg: "text-[#5B3FB0]", blurb: "Tasks and services" },
  { test: /tip/i, icon: Wallet, bg: "bg-[#DDEFEC]", fg: "text-[#0D5C58]", blurb: "Cash tips" },
];

export function sourceStyle(name: string) {
  return SOURCE_STYLES.find((s) => s.test.test(name)) ?? { icon: ShoppingBasket, bg: "bg-surface", fg: "text-teal", blurb: "Other income" };
}

export function SourceIcon({ name, size = 40 }: { name: string; size?: number }) {
  const s = sourceStyle(name);
  const Icon = s.icon;
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${s.bg} ${s.fg}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}
