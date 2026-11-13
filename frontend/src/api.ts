// Typed calls to the Steady FastAPI backend. Vite forwards /api/* to http://127.0.0.1:8000.

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError("Can't reach the Steady server. Is the backend running?", 0);
  }
  if (!res.ok) {
    let message = `Something went wrong (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
    } catch {
      /* keep the default message */
    }
    if (res.status === 502 || res.status === 504) message = "Can't reach the Steady server. Is the backend running?";
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path);
const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

// ---------- types ----------

export type CushionLevel = "light" | "moderate" | "strong";

export interface Status {
  onboarded: boolean;
  name: string;
  sources: number;
  today: string;
}

export interface Bill {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  repeat: "none" | "weekly" | "monthly";
  reserved: number;
  status: "funded" | "saving";
  progress: number;
}

export interface Breakdown {
  income: number;
  tax_set_aside: number;
  cushion: number;
  bills_reserve: number;
  spent: number;
}

export interface BillLine {
  bill: string;
  weeks_left: number;
  missing: number;
  this_week: number;
}

export interface SummaryCore {
  week_of: string;
  week_end: string;
  display: string;
  safe_to_spend_exact: number;
  range: { low: number; high: number };
  short_by: number;
  income_swings: boolean;
  breakdown: Breakdown;
  bills: BillLine[];
}

export interface Summary extends SummaryCore {
  name: string;
  tax_rate: number;
  cushion_level: CushionLevel;
  cushion_rate: number;
  upcoming_bills: Bill[];
  sources_this_week: { name: string; total: number; entries: number; last_date: string; share: number }[];
  cushion: { saved: number; goal: number; progress: number };
  next_two_weeks: { total: number; reserved: number; remaining: number; coverage: number; bills: Bill[] };
}

export interface PlanResult extends SummaryCore {
  covers_bills_and_taxes: boolean;
}

export interface Settings {
  tax_rate: number;
  cushion_level: CushionLevel;
  cushion_rate: number;
  name: string;
  categories: string[];
}

export interface Source {
  id: number;
  name: string;
}

export interface EntrySplit {
  amount: number;
  tax: number;
  cushion: number;
  toward_spending: number;
}

export interface ActivityItem {
  kind: "income" | "expense";
  id: number;
  label: string;
  amount: number;
  date: string;
  note: string | null;
  tax_held?: number;
}

export interface Activity {
  week_of: string;
  week_end: string;
  items: ActivityItem[];
  income: number;
  spent: number;
  last_week_income: number;
  last_week_spent: number;
  reserved: number;
  tax_rate: number;
}

export interface Weeks {
  weeks: { week_of: string; total: number }[];
  highest: number;
  lowest: number;
  average: number;
}

export interface Tax {
  quarter_income: number;
  quarter_set_aside: number;
  ytd_income: number;
  ytd_set_aside: number;
  self_employment_reminder: boolean;
  tax_rate: number;
  quarter: number;
  year: number;
  quarter_label: string;
  quarter_projection: number;
  quarter_progress: number;
  recent: { source: string; date: string; amount: number; set_aside: number }[];
}

// ---------- calls ----------

export const api = {
  status: () => get<Status>("/status"),
  completeSetup: () => send<Status>("POST", "/setup/complete"),
  reset: (mode: "demo" | "empty") => send<Status>("POST", "/reset", { mode }),

  summary: () => get<Summary>("/summary"),
  settings: () => get<Settings>("/settings"),
  saveSettings: (body: { tax_rate: number; cushion_level: CushionLevel; name?: string }) =>
    send<Settings>("PUT", "/settings", body),

  sources: () => get<Source[]>("/sources"),
  addSource: (name: string) => send<Source>("POST", "/sources", { name }),
  deleteSource: (id: number) => send<unknown>("DELETE", `/sources/${id}`),

  preview: (amount: number) => get<EntrySplit>(`/preview?amount=${amount}`),
  logIncome: (body: { source_id: number; amount: number; date_earned: string; note?: string }) =>
    send<{ id: number; breakdown: EntrySplit }>("POST", "/income", body),
  logExpense: (body: { amount: number; category: string; date: string; note?: string }) =>
    send<{ id: number }>("POST", "/expenses", body),
  deleteEntry: (kind: "income" | "expense", id: number) =>
    send<unknown>("DELETE", kind === "income" ? `/income/${id}` : `/expenses/${id}`),

  activity: (week?: string) => get<Activity>(week ? `/activity?week=${week}` : "/activity"),
  weeks: (n = 8) => get<Weeks>(`/weeks?n=${n}`),
  tax: () => get<Tax>("/tax"),
  plan: (income: number) => get<PlanResult>(`/plan?income=${income}`),

  bills: () => get<Bill[]>("/bills"),
  addBill: (body: { name: string; amount: number; due_date: string; repeat: Bill["repeat"]; reserved?: number }) =>
    send<{ id: number }>("POST", "/bills", body),
  payBill: (id: number) => send<unknown>("POST", `/bills/${id}/pay`),
  deleteBill: (id: number) => send<unknown>("DELETE", `/bills/${id}`),
};
