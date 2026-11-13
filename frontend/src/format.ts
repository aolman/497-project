// Formatting helpers. Dates from the API are "YYYY-MM-DD" and are read as local calendar days.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function wholeMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

export function shortDate(iso: string): string {
  const d = parseDay(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 10–16" or "Oct 27 – Nov 2" */
export function weekRange(startIso: string, endIso: string): string {
  const a = parseDay(startIso);
  const b = parseDay(endIso);
  if (a.getMonth() === b.getMonth()) return `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}`;
  return `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}

/** "Today", "Yesterday", or "Monday, Nov 10" */
export function dayLabel(iso: string): string {
  const today = todayIso();
  if (iso === today) return "Today";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === toIso(y)) return "Yesterday";
  const d = parseDay(iso);
  return `${DAYS[d.getDay()]}, ${shortDate(iso)}`;
}

/** Days from today until a date (negative if past). */
export function daysUntil(iso: string): number {
  const t = parseDay(todayIso()).getTime();
  return Math.round((parseDay(iso).getTime() - t) / 86_400_000);
}

export function dueLabel(iso: string): string {
  const n = daysUntil(iso);
  if (n < 0) return `Overdue since ${shortDate(iso)}`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n < 7) return `Due in ${n} days`;
  return `Due ${shortDate(iso)}`;
}

export function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Keep only a valid money string: digits, one dot, two decimals. */
export function cleanAmount(raw: string): string {
  let s = raw.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  if (s.startsWith("0") && s.length > 1 && s[1] !== ".") s = s.replace(/^0+/, "") || "0";
  return s.slice(0, 9);
}

export const CUSHION_INFO: Record<string, { label: string; rate: string; blurb: string }> = {
  light: { label: "Light", rate: "5%", blurb: "Small buffer. More to spend now." },
  moderate: { label: "Moderate", rate: "10%", blurb: "A balanced buffer for most weeks." },
  strong: { label: "Strong", rate: "15%", blurb: "Bigger buffer for very uneven income." },
};
