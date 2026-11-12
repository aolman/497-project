// Needs in index.html <head>:
//  DM Sans + Material Symbols Outlined (Google Fonts links from the Stitch export)
// Font weights/sizes come from the text-* tokens in tailwind.config.js, so the
// redundant font-* classes in the Stitch markup are dropped.

const Icon = ({ name, size = 20, filled = false, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontSize: size, ...(filled && { fontVariationSettings: "'FILL' 1" }) }}
    aria-hidden="true"
  >
    {name}
  </span>
);

// --- Data (swap for API state later) ---------------------------------------
const user = { name: "Maya", week: "Oct 14–20" };

const flow = {
  total: 412,
  range: "$180 – $210",
  updated: "14m ago",
  segments: [
    { key: "spend", label: "Safe for today", value: "~$190 (midpoint)", pct: 46, bar: "bg-primary-container", dot: "bg-primary-container" },
    { key: "tax", label: "Tax cushion (20%)", value: "-$82 locked", pct: 20, bar: "bg-tertiary-fixed-dim", dot: "bg-tertiary-fixed-dim" },
    { key: "buffer", label: "Smooth cushion", value: "-$60 buffer", pct: 15, bar: "bg-secondary", dot: "bg-secondary" },
    { key: "bills", label: "Bills reserve", value: "-$80 saved", pct: 19, bar: "bg-surface-dim", dot: "bg-surface-dim" },
  ],
};

const bills = [
  { id: "phone", icon: "smartphone", amount: "$45.00", title: "Mint Mobile", due: "Oct 15", status: "funded", note: "Auto-saved from DoorDash", noteIcon: "lock", tint: "bg-secondary-fixed/20 text-secondary" },
  { id: "rent", icon: "home", amount: "$850.00", title: "Apartment Rent", due: "Nov 1", status: "plan", saved: 663, total: 850, tint: "bg-primary-fixed/30 text-primary-container" },
  { id: "health", icon: "medical_services", amount: "$160.00", title: "Stride Plan", due: "Nov 5", status: "funded", note: "100% Protected", noteIcon: "verified", tint: "bg-surface-container-high text-on-surface" },
];

const sources = [
  { id: "dd", icon: "two_wheeler", name: "DoorDash", tag: "14 trips", when: "Yesterday at 9:42 PM", amount: "+$268.00", share: "65% of total", tint: "bg-tertiary-fixed-dim/20 text-tertiary" },
  { id: "ue", icon: "local_mall", name: "Uber Eats", tag: "5 orders", when: "Monday dinner run", amount: "+$94.00", share: "23% of total", tint: "bg-surface-container-high text-on-surface" },
  { id: "sp", icon: "photo_camera", name: "Studio Portraits", tag: "Deposit", when: "Direct transfer", amount: "+$50.00", share: "12% of total", tint: "bg-primary-fixed/30 text-primary-container" },
];

const tabs = [
  { id: "home", label: "Home", icon: "account_balance_wallet" },
  { id: "activity", label: "Activity", icon: "receipt_long" },
  { id: "plan", label: "Plan", icon: "insights" },
  { id: "settings", label: "Settings", icon: "tune" },
];

// --- Pieces -----------------------------------------------------------------
function TopBar({ title }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="h-14 px-margin flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="text-headline-sm text-primary tracking-tight">Steady</span>
          <span className="text-label-md text-outline-variant">/</span>
          <h1 className="text-headline-sm text-on-surface truncate max-w-[130px]">{title}</h1>
        </div>
        <button className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors" aria-label="Settings">
          {/* replace with the user's avatar */}
          <span className="w-8 h-8 rounded-full bg-primary-fixed text-primary text-label-lg flex items-center justify-center">M</span>
        </button>
      </div>
    </header>
  );
}

function SafeToSpendCard() {
  return (
    <section className="relative overflow-hidden bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-4">
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary-fixed/25 blur-2xl pointer-events-none" />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-label-md text-on-surface-variant">Safe to spend this week</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed-dim/20 text-tertiary text-label-sm">
              <Icon name="tune" size={13} /> ESTIMATE
            </span>
          </div>
          <div className="text-display-hero-mobile text-on-surface tracking-tight">{flow.range}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary-fixed/25 flex items-center justify-center text-secondary">
          <Icon name="spa" filled />
        </div>
      </div>

      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-container-low">
        <Icon name="check_circle" className="text-secondary" />
        <p className="text-body-sm text-on-surface-variant">All current bills &amp; upcoming reserves are fully covered.</p>
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center text-label-md">
          <span className="text-on-surface-variant">Weekly Earned Flow</span>
          <span className="text-on-surface">${flow.total.toFixed(2)} total</span>
        </div>
        <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex p-0.5 gap-1" role="img"
             aria-label={flow.segments.map((s) => `${s.label} ${s.pct}%`).join(", ")}>
          {flow.segments.map((s) => (
            <div key={s.key} className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {flow.segments.map((s) => (
            <div key={s.key} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
              <div className="min-w-0">
                <span className="text-label-sm text-on-surface-variant block truncate">{s.label}</span>
                <span className="text-label-md text-on-surface">{s.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" className="inline-flex items-center gap-1.5 text-label-md text-primary-container hover:opacity-80 transition-opacity">
          <Icon name="info" size={17} /> How is this calculated?
        </button>
        <span className="text-label-sm text-on-surface-variant">Updated {flow.updated}</span>
      </div>
    </section>
  );
}

function ActionButtons({ onIncome, onExpense }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onIncome} className="h-12 rounded-lg bg-primary-container text-on-primary flex items-center justify-center gap-2 shadow-sm text-label-lg active:scale-[0.98] transition-transform">
        <Icon name="add_circle" /> Log income
      </button>
      <button type="button" onClick={onExpense} className="h-12 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center gap-2 text-label-lg active:scale-[0.98] transition-transform">
        <Icon name="remove_circle_outline" /> Log expense
      </button>
    </div>
  );
}

function BillCard({ bill }) {
  const funded = bill.status === "funded";
  return (
    <article className="min-w-[210px] bg-surface-container-lowest rounded-xl p-3.5 shadow-sm space-y-2.5 shrink-0">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bill.tint}`}>
          <Icon name={bill.icon} size={18} />
        </div>
        <span className={`px-2 py-0.5 rounded-full text-label-sm flex items-center gap-1 ${funded ? "bg-secondary-container/30 text-secondary" : "bg-surface-container-high text-on-surface-variant"}`}>
          <Icon name={funded ? "check" : "savings"} size={12} />
          {funded ? "Funded" : "In cushion plan"}
        </span>
      </div>
      <div>
        <div className="text-headline-sm text-on-surface">{bill.amount}</div>
        <div className="text-body-sm text-on-surface-variant">{bill.title} • Due {bill.due}</div>
      </div>
      {bill.saved != null ? (
        <>
          <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary-container h-full rounded-full" style={{ width: `${Math.round((bill.saved / bill.total) * 100)}%` }} />
          </div>
          <div className="text-label-sm text-on-surface-variant flex justify-between">
            <span>${bill.saved} of ${bill.total} set aside</span>
            <span className="text-primary-container">{Math.round((bill.saved / bill.total) * 100)}%</span>
          </div>
        </>
      ) : (
        <div className="text-label-sm text-on-surface-variant flex items-center gap-1">
          <Icon name={bill.noteIcon} size={14} className="text-secondary" /> {bill.note}
        </div>
      )}
    </article>
  );
}

function UpcomingBills() {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm text-on-surface">Upcoming Fixed Bills</h2>
        <a href="#" className="text-label-md text-primary-container hover:underline">All bills ({bills.length})</a>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-margin px-margin [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {bills.map((b) => <BillCard key={b.id} bill={b} />)}
      </div>
    </section>
  );
}

function ActiveSources() {
  return (
    <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-sm text-on-surface">Active Sources This Week</h2>
          <p className="text-body-sm text-on-surface-variant">{sources.length} flexible platforms connected</p>
        </div>
        <button type="button" aria-label="Sync sources" className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
          <Icon name="sync" size={18} />
        </button>
      </div>
      <ul className="space-y-2.5 pt-1">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${s.tint}`}><Icon name={s.icon} /></div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-body-md font-semibold text-on-surface">{s.name}</span>
                  <span className="text-label-sm px-1.5 rounded bg-surface-container text-on-surface-variant">{s.tag}</span>
                </div>
                <span className="text-label-sm text-on-surface-variant">{s.when}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-headline-sm text-on-surface">{s.amount}</span>
              <span className="text-label-sm text-secondary block">{s.share}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="pt-1 flex items-center justify-between text-body-sm text-on-surface-variant">
        <span>Auto-smoothed into steady deposits</span>
        <button type="button" className="text-label-md text-primary-container hover:underline">Manage splits</button>
      </div>
    </section>
  );
}

function Affirmation() {
  return (
    <aside className="p-4 rounded-xl bg-surface-container-low flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-secondary-fixed/40 text-secondary flex items-center justify-center shrink-0 mt-0.5">
        <Icon name="nature_people" />
      </div>
      <div className="space-y-1">
        <h3 className="text-label-lg text-on-surface">You're doing great, {user.name}</h3>
        <p className="text-body-sm text-on-surface-variant">
          Even with volatile delivery patterns, your tax and rent buffers are ahead of schedule. Take time to rest tonight.
        </p>
      </div>
    </aside>
  );
}

function TabBar({ active = "home", onChange = () => {} }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.03)] pb-[env(safe-area-inset-bottom)]">
      <div className="h-16 px-space-sm grid grid-cols-4 items-center">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-current={active === t.id ? "page" : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors ${active === t.id ? "text-primary-container font-semibold" : "text-on-surface-variant hover:text-on-surface"}`}>
            <Icon name={t.icon} size={24} />
            <span className="text-label-sm mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// --- Screen -----------------------------------------------------------------
export default function HomeScreen() {
  return (
    <div className="bg-surface font-sans text-on-surface antialiased">
      <TopBar title="Home" />
      <main className="w-full min-h-screen pt-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] pb-24 px-margin space-y-4">
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-headline-lg-mobile text-on-surface">Hi {user.name}</span>
              <span className="text-xl" aria-hidden="true">🌿</span>
            </div>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              Week of {user.week}
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="text-secondary font-medium flex items-center gap-0.5"><Icon name="shield" size={14} /> Buffer healthy</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container shadow-sm">
            <Icon name="calendar_today" size={22} />
          </div>
        </div>

        <SafeToSpendCard />
        <ActionButtons />
        <UpcomingBills />
        <ActiveSources />
        <Affirmation />
      </main>
      <TabBar />
    </div>
  );
}