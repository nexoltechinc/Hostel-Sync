"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, CircleDollarSign, NotebookPen, Receipt, RefreshCcw, Search, Send, ShieldCheck, Sparkles, TriangleAlert, Wallet } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { moduleIcons } from "@/lib/app-icons";

const NOW = new Date("2026-03-30T23:30:00");
const PAGE_SIZE = 6;

const tones = {
  blue: { solid: "#2563eb", soft: "#60a5fa", surface: "rgba(37,99,235,0.16)" },
  green: { solid: "#16a34a", soft: "#4ade80", surface: "rgba(22,163,74,0.16)" },
  orange: { solid: "#f08c2e", soft: "#f6c25d", surface: "rgba(240,140,46,0.16)" },
  red: { solid: "#ef4444", soft: "#fb7185", surface: "rgba(239,68,68,0.18)" },
  gray: { solid: "#64748b", soft: "#cbd5e1", surface: "rgba(100,116,139,0.18)" },
} as const;

const quickActions = [
  { label: "Record Payment", desc: "Post live resident collections.", icon: Wallet, tone: tones.green },
  { label: "Generate Invoice", desc: "Run monthly billing cycles.", icon: Receipt, tone: tones.blue },
  { label: "Add Charge", desc: "Apply rent, mess, or utility entries.", icon: CircleDollarSign, tone: tones.orange },
  { label: "Adjust / Reverse Entry", desc: "Correct history through linked reversals.", icon: RefreshCcw, tone: tones.red },
] as const;

const kpis = [
  { title: "Total Revenue (This Month)", value: "$42,560", note: "Gross billed amount", tone: tones.blue },
  { title: "Total Collected", value: "$37,920", note: "Cash settled into ledger", tone: tones.green },
  { title: "Pending Payments", value: "$4,630", note: "Awaiting completion", tone: tones.orange },
  { title: "Overdue Amount", value: "$2,180", note: "High-visibility recovery queue", tone: tones.red },
  { title: "Credit Balance", value: "$940", note: "Auto-applies to future bills", tone: tones.blue },
  { title: "Failed Transactions", value: "6", note: "Retry or alternate method needed", tone: tones.gray },
] as const;

const statusMeta = {
  paid: { label: "Paid", tone: tones.green, tip: "Cash posted and cleared." },
  pending: { label: "Pending", tone: tones.orange, tip: "Entry posted, settlement pending." },
  overdue: { label: "Overdue", tone: tones.red, tip: "Invoice is past due." },
  failed: { label: "Failed", tone: tones.gray, tip: "Payment attempt failed." },
  adjusted: { label: "Adjusted", tone: tones.blue, tip: "Corrected via reversal or adjustment." },
} as const;

const typeMeta = {
  charge: { label: "Charge", tone: tones.blue },
  payment: { label: "Payment", tone: tones.green },
  adjustment: { label: "Adjustment", tone: tones.blue },
  reversal: { label: "Reversal", tone: tones.gray },
} as const;

const categoryMeta = {
  rent: { label: "Rent", tone: tones.blue },
  mess: { label: "Mess", tone: tones.green },
  utility: { label: "Utility", tone: tones.orange },
  fine: { label: "Fine", tone: tones.red },
  other: { label: "Other", tone: tones.gray },
} as const;

const ledger = [
  { id: "PAY-88421", date: "2026-03-30T16:15:00", resident: "Zahra Ali", room: "A-12 / Bed 2", type: "payment", category: "rent", amount: 520, direction: "credit", balance: 180, status: "paid", note: "March rent payment via bank transfer." },
  { id: "INV-88217", date: "2026-03-30T11:40:00", resident: "Hassan Raza", room: "B-07 / Bed 1", type: "charge", category: "utility", amount: 45, direction: "debit", balance: 245, status: "pending", note: "Power backup surcharge for March." },
  { id: "ADJ-88202", date: "2026-03-29T18:20:00", resident: "Sana Iqbal", room: "C-03 / Bed 4", type: "adjustment", category: "other", amount: 30, direction: "credit", balance: 120, status: "adjusted", note: "Service recovery credit linked to INV-88176." },
  { id: "REV-88195", date: "2026-03-29T10:05:00", resident: "Ahmed Noor", room: "B-02 / Bed 3", type: "reversal", category: "fine", amount: 20, direction: "credit", balance: 0, status: "adjusted", note: "Late key fine reversed from FINE-88111." },
  { id: "PAY-88170", date: "2026-03-28T14:50:00", resident: "Maira Khan", room: "A-05 / Bed 1", type: "payment", category: "mess", amount: 190, direction: "credit", balance: 0, status: "paid", note: "Mess dues settled at finance desk." },
  { id: "INV-88142", date: "2026-03-27T09:15:00", resident: "Bilal Shah", room: "C-11 / Bed 2", type: "charge", category: "rent", amount: 540, direction: "debit", balance: 540, status: "overdue", note: "Monthly rent invoice is overdue." },
  { id: "PAY-88133", date: "2026-03-27T08:20:00", resident: "Umar Farooq", room: "B-11 / Bed 2", type: "payment", category: "rent", amount: 540, direction: "credit", balance: 540, status: "failed", note: "Card payment declined by issuer." },
  { id: "INV-88106", date: "2026-03-26T19:30:00", resident: "Zahra Ali", room: "A-12 / Bed 2", type: "charge", category: "fine", amount: 60, direction: "debit", balance: 700, status: "pending", note: "Late checkout penalty posted." },
  { id: "ADJ-88092", date: "2026-03-25T15:00:00", resident: "Hassan Raza", room: "B-07 / Bed 1", type: "adjustment", category: "utility", amount: 15, direction: "credit", balance: 230, status: "adjusted", note: "Meter recalibration credit linked to INV-88044." },
  { id: "PAY-88061", date: "2026-03-24T13:10:00", resident: "Noor Fatima", room: "D-03 / Bed 4", type: "payment", category: "rent", amount: 520, direction: "credit", balance: -80, status: "paid", note: "Overpayment converted into future credit." },
];

const invoiceCycles = [
  { label: "March 2026 Cycle", generated: 428, upcoming: 0, total: "$24,980", state: "Closed", tone: tones.green },
  { label: "April 2026 Cycle", generated: 401, upcoming: 35, total: "$26,340", state: "In Review", tone: tones.orange },
  { label: "May 2026 Preview", generated: 0, upcoming: 438, total: "$27,110", state: "Scheduled", tone: tones.blue },
];

const defaulters = [
  { resident: "Bilal Shah", room: "C-11 / Bed 2", due: "$540", days: 13, last: "Feb 27, 2026" },
  { resident: "Hassan Raza", room: "B-07 / Bed 1", due: "$245", days: 8, last: "Mar 11, 2026" },
  { resident: "Areeba Malik", room: "D-09 / Bed 1", due: "$710", days: 17, last: "Feb 22, 2026" },
  { resident: "Umar Farooq", room: "B-11 / Bed 2", due: "$540", days: 10, last: "Mar 3, 2026" },
];

const credits = [
  { resident: "Noor Fatima", room: "D-03 / Bed 4", amount: "$80", next: "Apr 1, 2026", note: "Auto-applies to April rent." },
  { resident: "Sana Iqbal", room: "C-03 / Bed 4", amount: "$210", next: "Apr 1, 2026", note: "Split against rent and utility." },
  { resident: "Ali Hamza", room: "A-08 / Bed 1", amount: "$650", next: "Apr 1, 2026", note: "Advance deposit retained for future cycles." },
];

function badge(label: string, tone: (typeof tones)[keyof typeof tones], title: string) {
  return <span title={title} className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: tone.surface, backgroundColor: tone.surface, color: tone.soft }}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.solid }} />{label}</span>;
}

export default function BillingPage() {
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState("all");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("30d");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const search = deferredQuery.trim().toLowerCase();
  const rows = ledger.filter((entry) => {
    const haystack = `${entry.id} ${entry.resident} ${entry.note}`.toLowerCase();
    const matchesRange = range === "all" || NOW.getTime() - new Date(entry.date).getTime() <= (range === "7d" ? 7 : range === "30d" ? 30 : 90) * 24 * 60 * 60 * 1000;
    return (!search || haystack.includes(search)) && (room === "all" || entry.room.startsWith(room)) && (type === "all" || entry.type === type) && (category === "all" || entry.category === category) && (status === "all" || entry.status === status) && matchesRange;
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return (
    <section className="space-y-6 pb-3">
      <section className="panel panel-soft panel-elevated relative overflow-hidden p-5 md:p-6 lg:p-7">
        <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(circle at 18% 16%, rgba(37,99,235,0.2), transparent 34%), radial-gradient(circle at 84% 14%, rgba(22,163,74,0.15), transparent 32%), radial-gradient(circle at 72% 100%, rgba(240,140,46,0.12), transparent 38%)" }} />
        <div className="relative space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className="dashboard-chip"><ShieldCheck className="h-3.5 w-3.5" />Immutable ledger</span>
            <span className="dashboard-chip"><Sparkles className="h-3.5 w-3.5" />Auto-billing active</span>
            <span className="dashboard-chip"><span className="status-dot bg-[var(--status-danger)] text-[var(--status-danger)]" />4 overdue accounts</span>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.95fr)]">
            <SectionHeading icon={moduleIcons.billing} eyebrow="Finance Control" title="Billing & Fee Management" description="Manage payments, invoices, dues, credits, reversals, and audit-ready financial records from one financial mission control workspace." />
            <label className="flex min-h-[78px] items-center gap-3 rounded-[18px] border bg-[rgba(255,255,255,0.05)] px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
              <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Advanced Search</p>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resident name, invoice ID, or transaction ID" className="mt-1 w-full bg-transparent text-sm text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-muted)]" />
                {deferredQuery ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">Searching for &quot;{deferredQuery}&quot;</p> : null}
              </div>
            </label>
          </div>

          <div className="grid gap-3 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" title={action.desc} className="rounded-[18px] border px-4 py-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: action.tone.surface, background: `linear-gradient(135deg, ${action.tone.surface} 0%, rgba(255,255,255,0.04) 100%)` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-strong)]">{action.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">{action.desc}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border" style={{ borderColor: action.tone.surface, background: action.tone.surface, color: action.tone.soft }}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {kpis.map((card) => (
              <article key={card.title} className="rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-4" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-soft)]">{card.title}</p>
                    <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.05em] text-[var(--color-text-strong)]">{card.value}</p>
                  </div>
                  <span className="mt-1 inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: card.tone.solid }} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{card.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)]">
        <section className="panel panel-soft p-5 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Immutable Payment Ledger</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Bank-style financial ledger</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">No direct editing is allowed. Every correction appears as a linked reversal or adjustment entry.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[{ label: "Room", value: room, set: setRoom, options: [["all", "All rooms"], ["A-", "A Block"], ["B-", "B Block"], ["C-", "C Block"], ["D-", "D Block"]] }, { label: "Type", value: type, set: setType, options: [["all", "All types"], ["charge", "Charge"], ["payment", "Payment"], ["adjustment", "Adjustment"], ["reversal", "Reversal"]] }, { label: "Category", value: category, set: setCategory, options: [["all", "All categories"], ["rent", "Rent"], ["mess", "Mess"], ["utility", "Utility"], ["fine", "Fine"], ["other", "Other"]] }, { label: "Status", value: status, set: setStatus, options: [["all", "All statuses"], ["paid", "Paid"], ["pending", "Pending"], ["overdue", "Overdue"], ["failed", "Failed"], ["adjusted", "Adjusted"]] }, { label: "Date Range", value: range, set: setRange, options: [["all", "All dates"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"]] }].map((field) => <label key={field.label} className="space-y-1.5"><span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">{field.label}</span><select value={field.value} onChange={(event) => { field.set(event.target.value); setPage(1); }} className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-[var(--color-text-strong)] outline-none" style={{ borderColor: "var(--color-border)" }}>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[1220px] w-full border-separate border-spacing-y-3 text-sm">
              <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Resident</th><th className="px-3 py-2">Room / Bed</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Debit / Credit</th><th className="px-3 py-2">Balance After</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2 text-right">Quick Actions</th></tr></thead>
              <tbody>
                {pageRows.map((entry) => <tr key={entry.id} className="align-top"><td className="rounded-l-xl border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(entry.date))}</td><td className="border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}><p className="font-semibold text-[var(--color-text-strong)]">{entry.resident}</p><p className="mt-2 text-xs text-[var(--color-text-muted)]">{entry.note}</p></td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.room}</td><td className="border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{badge(typeMeta[entry.type as keyof typeof typeMeta].label, typeMeta[entry.type as keyof typeof typeMeta].tone, `${entry.type} entry`)}</td><td className="border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{badge(categoryMeta[entry.category as keyof typeof categoryMeta].label, categoryMeta[entry.category as keyof typeof categoryMeta].tone, `${entry.category} category`)}</td><td className="border border-r-0 px-4 py-4 font-semibold text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.direction === "debit" ? "-" : "+"}${entry.amount}</td><td className="border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.direction === "debit" ? <span className="font-semibold text-[var(--status-danger)]">Debit</span> : <span className="font-semibold text-[var(--status-success)]">Credit</span>}</td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>${entry.balance}</td><td className="border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{badge(statusMeta[entry.status as keyof typeof statusMeta].label, statusMeta[entry.status as keyof typeof statusMeta].tone, statusMeta[entry.status as keyof typeof statusMeta].tip)}</td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.id}</td><td className="rounded-r-xl border px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}><div className="flex flex-wrap justify-end gap-2"><button type="button" title="Open trace details" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: tones.blue.surface, background: tones.blue.surface, color: tones.blue.soft }}><ArrowUpRight className="h-3.5 w-3.5" />Trace</button><button type="button" title="Post adjustment entry" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: tones.orange.surface, background: tones.orange.surface, color: tones.orange.soft }}><NotebookPen className="h-3.5 w-3.5" />Adjust</button><button type="button" title={entry.status === "failed" ? "Retry payment" : "Create reversal"} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: tones.red.surface, background: tones.red.surface, color: tones.red.soft }}><RefreshCcw className="h-3.5 w-3.5" />{entry.status === "failed" ? "Retry" : "Reverse"}</button></div></td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--color-border)" }}><p className="text-[var(--color-text-muted)]">Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(rows.length, currentPage * PAGE_SIZE)} of {rows.length} ledger entries</p><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[var(--color-text-soft)] disabled:opacity-40" style={{ borderColor: "var(--color-border)" }}><ChevronLeft className="h-4 w-4" /></button><span className="rounded-full border px-3 py-2 text-xs font-medium text-[var(--color-text-soft)]" style={{ borderColor: "var(--color-border)" }}>Page {currentPage} of {pageCount}</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[var(--color-text-soft)] disabled:opacity-40" style={{ borderColor: "var(--color-border)" }}><ChevronRight className="h-4 w-4" /></button></div></div>
        </section>

        <div className="space-y-6">
          <section className="panel panel-soft p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Billing & Invoice Section</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Cycle management</h2><div className="mt-5 space-y-3">{invoiceCycles.map((cycle) => <article key={cycle.label} className="rounded-xl border bg-[rgba(255,255,255,0.04)] p-4" style={{ borderColor: "var(--color-border)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--color-text-strong)]">{cycle.label}</p><p className="mt-1 text-sm text-[var(--color-text-soft)]">{cycle.generated} generated · {cycle.upcoming} upcoming</p></div>{badge(cycle.state, cycle.tone, `${cycle.label} status`)}</div><p className="mt-4 text-xl font-semibold text-[var(--color-text-strong)]">{cycle.total}</p></article>)}</div></section>
          <section className="panel panel-soft p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">High-Visibility Defaulters</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Recovery queue</h2><div className="mt-5 space-y-3">{defaulters.map((resident) => <article key={resident.resident} className="rounded-xl border bg-[rgba(255,255,255,0.04)] p-4" style={{ borderColor: "var(--color-border)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--color-text-strong)]">{resident.resident}</p><p className="mt-1 text-sm text-[var(--color-text-soft)]">{resident.room}</p></div>{badge(`${resident.days}d`, tones.red, "Days overdue")}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Due amount</p><p className="mt-1 text-lg font-semibold text-[var(--color-text-strong)]">{resident.due}</p></div><div><p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Last payment</p><p className="mt-1 text-sm text-[var(--color-text-strong)]">{resident.last}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: tones.orange.surface, background: tones.orange.surface, color: tones.orange.soft }}><Send className="h-3.5 w-3.5" />Send Reminder</button><button type="button" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: tones.green.surface, background: tones.green.surface, color: tones.green.soft }}><Wallet className="h-3.5 w-3.5" />Record Payment</button></div></article>)}</div></section>
          <section className="panel panel-soft p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Credit & Balance System</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Overpayment balances</h2><div className="mt-5 space-y-3">{credits.map((credit) => <article key={credit.resident} className="rounded-xl border bg-[rgba(255,255,255,0.04)] p-4" style={{ borderColor: "var(--color-border)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--color-text-strong)]">{credit.resident}</p><p className="mt-1 text-sm text-[var(--color-text-soft)]">{credit.room}</p></div>{badge(credit.amount, tones.blue, "Credit held for future billing")}</div><p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">{credit.note}</p><p className="mt-2 text-xs text-[var(--color-text-muted)]">Auto-adjusts on {credit.next}</p></article>)}</div></section>
        </div>
      </div>

      <section className="rounded-xl border p-5" style={{ borderColor: tones.red.surface, background: "linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(255,255,255,0.03) 100%)" }}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] text-white"><TriangleAlert className="h-4 w-4" /></span>
          <div><p className="text-sm font-semibold text-[var(--color-text-strong)]">Financial mission control note</p><p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">This redesign keeps corrections audit-safe by routing every fix through explicit financial entries rather than row edits.</p></div>
        </div>
      </section>
    </section>
  );
}
