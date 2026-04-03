"use client";

import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  FileText,
  Filter,
  NotebookPen,
  Receipt,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

type TxType = "charge" | "payment" | "adjustment" | "reversal";
type TxStatus = "paid" | "pending" | "overdue" | "failed" | "adjusted";
type TxCategory = "rent" | "mess" | "utility" | "fine" | "other";
type TxDir = "debit" | "credit";
type Mode = "payment" | "invoice" | null;

type Row = {
  id: string;
  date: string;
  resident: string;
  reg: string;
  room: string;
  type: TxType;
  category: TxCategory;
  amount: number;
  direction: TxDir;
  balance: number;
  status: TxStatus;
  note: string;
};

const PAGE_SIZE = 8;
const NOW = new Date("2026-03-30T23:30:00");

const seed: Row[] = [
  { id: "PAY-88421", date: "2026-03-30T16:15:00", resident: "Zahra Ali", reg: "REG-1304", room: "A-12 / Bed 2", type: "payment", category: "rent", amount: 520, direction: "credit", balance: 180, status: "paid", note: "March rent payment via bank transfer." },
  { id: "INV-88217", date: "2026-03-30T11:40:00", resident: "Hassan Raza", reg: "REG-1276", room: "B-07 / Bed 1", type: "charge", category: "utility", amount: 45, direction: "debit", balance: 245, status: "pending", note: "Power backup surcharge for March." },
  { id: "ADJ-88202", date: "2026-03-29T18:20:00", resident: "Sana Iqbal", reg: "REG-1218", room: "C-03 / Bed 4", type: "adjustment", category: "other", amount: 30, direction: "credit", balance: 120, status: "adjusted", note: "Service recovery credit linked to INV-88176." },
  { id: "REV-88195", date: "2026-03-29T10:05:00", resident: "Ahmed Noor", reg: "REG-1232", room: "B-02 / Bed 3", type: "reversal", category: "fine", amount: 20, direction: "credit", balance: 0, status: "adjusted", note: "Late key fine reversed from FINE-88111." },
  { id: "PAY-88170", date: "2026-03-28T14:50:00", resident: "Maira Khan", reg: "REG-1339", room: "A-05 / Bed 1", type: "payment", category: "mess", amount: 190, direction: "credit", balance: 0, status: "paid", note: "Mess dues settled at finance desk." },
  { id: "INV-88142", date: "2026-03-27T09:15:00", resident: "Bilal Shah", reg: "REG-1155", room: "C-11 / Bed 2", type: "charge", category: "rent", amount: 540, direction: "debit", balance: 540, status: "overdue", note: "Monthly rent invoice is overdue." },
  { id: "PAY-88133", date: "2026-03-27T08:20:00", resident: "Umar Farooq", reg: "REG-1209", room: "B-11 / Bed 2", type: "payment", category: "rent", amount: 540, direction: "credit", balance: 540, status: "failed", note: "Card payment declined by issuer." },
  { id: "INV-88106", date: "2026-03-26T19:30:00", resident: "Zahra Ali", reg: "REG-1304", room: "A-12 / Bed 2", type: "charge", category: "fine", amount: 60, direction: "debit", balance: 700, status: "pending", note: "Late checkout penalty posted." },
];

function makeId(prefix: "PAY" | "INV" | "ADJ" | "REV", n: number) {
  return `${prefix}-${String(90000 + n).slice(-5)}`;
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function badge(text: string, className: string) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${className}`}>{text}</span>;
}

export default function BillingPage() {
  const [rows, setRows] = useState<Row[]>(seed);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TxType | "all">("all");
  const [status, setStatus] = useState<TxStatus | "all">("all");
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [category, setCategory] = useState<TxCategory | "all">("all");
  const [room, setRoom] = useState("all");
  const [showCollections, setShowCollections] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pay, setPay] = useState({ reg: "", amount: "0", method: "cash", note: "" });
  const [invoice, setInvoice] = useState({ cycle: "April 2026", category: "rent" as TxCategory, amount: "540" });

  const deferred = useDeferredValue(query);
  const search = deferred.trim().toLowerCase();

  const residents = useMemo(() => {
    const map = new Map<string, { resident: string; reg: string; room: string }>();
    for (const row of rows) if (!map.has(row.reg)) map.set(row.reg, { resident: row.resident, reg: row.reg, room: row.room });
    return Array.from(map.values());
  }, [rows]);

  const filtered = useMemo(() => {
    const ms = range === "7d" ? 7 * 86400000 : range === "30d" ? 30 * 86400000 : range === "90d" ? 90 * 86400000 : Number.POSITIVE_INFINITY;
    return rows.filter((row) => {
      const text = `${row.id} ${row.resident} ${row.reg} ${row.note}`.toLowerCase();
      if (search && !text.includes(search)) return false;
      if (type !== "all" && row.type !== type) return false;
      if (status !== "all" && row.status !== status) return false;
      if (category !== "all" && row.category !== category) return false;
      if (room !== "all" && !row.room.startsWith(room)) return false;
      return NOW.getTime() - new Date(row.date).getTime() <= ms;
    });
  }, [rows, search, type, status, category, room, range]);

  const overdue = rows.filter((row) => row.status === "overdue");
  const overdueAmount = overdue.reduce((sum, row) => sum + row.amount, 0);
  const pending = rows.filter((row) => row.status === "pending" || row.status === "overdue").length;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function resetFeedback() {
    setNotice(null);
    setError(null);
  }

  function postPayment() {
    resetFeedback();
    const profile = residents.find((x) => x.reg === pay.reg);
    const amount = Number(pay.amount);
    if (!profile) return setError("Select a resident.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter a valid amount.");
    const bal = (rows.find((r) => r.reg === profile.reg)?.balance ?? 0) - amount;
    const entry: Row = {
      id: makeId("PAY", rows.length + 1),
      date: NOW.toISOString(),
      resident: profile.resident,
      reg: profile.reg,
      room: profile.room,
      type: "payment",
      category: "other",
      amount,
      direction: "credit",
      balance: bal,
      status: "paid",
      note: pay.note.trim() || `Posted via ${pay.method}.`,
    };
    setRows((prev) => [entry, ...prev]);
    setNotice(`Payment posted for ${profile.resident}.`);
  }

  function runInvoice() {
    resetFeedback();
    const amount = Number(invoice.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter a valid invoice amount.");
    const targets = residents.slice(0, 5);
    if (targets.length === 0) return setError("No resident data available.");
    const additions = targets.map((r, i) => ({
      id: makeId("INV", rows.length + i + 1),
      date: NOW.toISOString(),
      resident: r.resident,
      reg: r.reg,
      room: r.room,
      type: "charge" as TxType,
      category: invoice.category,
      amount,
      direction: "debit" as TxDir,
      balance: (rows.find((x) => x.reg === r.reg)?.balance ?? 0) + amount,
      status: "pending" as TxStatus,
      note: `${invoice.cycle} generated invoice.`,
    }));
    setRows((prev) => [...additions, ...prev]);
    setNotice(`${additions.length} invoices generated.`);
  }

  function adjust(row: Row) {
    const value = Math.max(10, Math.round(row.amount * 0.1));
    const entry: Row = { id: makeId("ADJ", rows.length + 1), date: NOW.toISOString(), resident: row.resident, reg: row.reg, room: row.room, type: "adjustment", category: "other", amount: value, direction: "credit", balance: row.balance - value, status: "adjusted", note: `Adjustment linked to ${row.id}.` };
    setRows((prev) => [entry, ...prev]);
    setNotice(`Adjustment posted for ${row.resident}.`);
  }

  function reverse(row: Row) {
    const dir: TxDir = row.direction === "debit" ? "credit" : "debit";
    const nextBal = row.balance + (dir === "debit" ? row.amount : -row.amount);
    const entry: Row = { id: makeId("REV", rows.length + 1), date: NOW.toISOString(), resident: row.resident, reg: row.reg, room: row.room, type: "reversal", category: row.category, amount: row.amount, direction: dir, balance: nextBal, status: "adjusted", note: `Reversal for ${row.id}.` };
    setRows((prev) => [entry, ...prev]);
    setNotice(`Reversal posted for ${row.id}.`);
  }

  return (
    <section className="space-y-6 pb-3" onClick={() => setOpenMenuId(null)}>
      <section className="panel panel-soft panel-elevated p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-chip"><ShieldCheck className="h-3.5 w-3.5" />Immutable ledger</span>
          <span className="dashboard-chip"><Sparkles className="h-3.5 w-3.5" />Workflow billing</span>
          <button type="button" onClick={() => setShowCollections((v) => !v)} className="dashboard-chip"><TriangleAlert className="h-3.5 w-3.5 text-rose-300" />Overdue ${overdueAmount}</button>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Billing & Fee Management</h1>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">Focused financial workspace for payments, invoice runs, and ledger operations.</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setMode("payment"); resetFeedback(); }} className="dashboard-cta dashboard-cta-primary"><Wallet className="h-4 w-4" />Record Payment</button>
          <button type="button" onClick={() => { setMode("invoice"); resetFeedback(); }} className="dashboard-cta dashboard-cta-secondary"><Receipt className="h-4 w-4" />Generate Invoice</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rooms-overview-card"><p className="text-xs text-[var(--color-text-muted)]">Pending Queue</p><p className="mt-1 text-2xl font-semibold text-[var(--color-text-strong)]">{pending}</p></article>
          <article className="rooms-overview-card"><p className="text-xs text-[var(--color-text-muted)]">Filtered Rows</p><p className="mt-1 text-2xl font-semibold text-[var(--color-text-strong)]">{filtered.length}</p></article>
        </div>
      </section>

      <section className="panel panel-soft p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_140px_auto]">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search resident, reg ID, or transaction..." className="members-input w-full py-2.5 pl-9" /></label>
          <select value={type} onChange={(e) => { setType(e.target.value as TxType | "all"); setPage(1); }} className="members-select py-2.5"><option value="all">All types</option><option value="charge">Charge</option><option value="payment">Payment</option><option value="adjustment">Adjustment</option><option value="reversal">Reversal</option></select>
          <select value={status} onChange={(e) => { setStatus(e.target.value as TxStatus | "all"); setPage(1); }} className="members-select py-2.5"><option value="all">All status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="failed">Failed</option><option value="adjusted">Adjusted</option></select>
          <select value={range} onChange={(e) => { setRange(e.target.value as "7d" | "30d" | "90d" | "all"); setPage(1); }} className="members-select py-2.5"><option value="all">All dates</option><option value="7d">Last 7d</option><option value="30d">Last 30d</option><option value="90d">Last 90d</option></select>
          <div className="flex items-center justify-end"><button type="button" onClick={() => setShowAdvanced((v) => !v)} className="dashboard-cta dashboard-cta-secondary py-2 text-xs"><Filter className="h-3.5 w-3.5" />Advanced</button></div>
        </div>
        {showAdvanced ? <div className="mt-3 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-3"><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Category</span><select value={category} onChange={(e) => setCategory(e.target.value as TxCategory | "all")} className="members-select"><option value="all">All categories</option><option value="rent">Rent</option><option value="mess">Mess</option><option value="utility">Utility</option><option value="fine">Fine</option><option value="other">Other</option></select></label><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Room Block</span><select value={room} onChange={(e) => setRoom(e.target.value)} className="members-select"><option value="all">All blocks</option><option value="A-">A Block</option><option value="B-">B Block</option><option value="C-">C Block</option><option value="D-">D Block</option></select></label><div className="flex items-end justify-end"><button type="button" onClick={() => { setCategory("all"); setRoom("all"); setShowAdvanced(false); }} className="dashboard-cta dashboard-cta-secondary py-2 text-xs"><X className="h-3.5 w-3.5" />Reset</button></div></div> : null}
      </section>

      {mode ? <section className="panel panel-soft p-5"><div className="flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{mode === "payment" ? "Record Payment Workflow" : "Generate Invoice Workflow"}</p><button type="button" onClick={() => setMode(null)} className="dashboard-cta dashboard-cta-secondary py-1.5 text-xs"><X className="h-3.5 w-3.5" />Close</button></div>{error ? <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}{notice ? <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</div> : null}{mode === "payment" ? <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Resident</span><select value={pay.reg} onChange={(e) => setPay((p) => ({ ...p, reg: e.target.value }))} className="members-select"><option value="">Select resident</option>{residents.map((r) => <option key={r.reg} value={r.reg}>{r.resident} ({r.reg})</option>)}</select></label><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Amount</span><input value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} className="members-input" /></label><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Method</span><select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))} className="members-select"><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="upi">UPI</option></select></label><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Note</span><input value={pay.note} onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} className="members-input" /></label><button type="button" onClick={postPayment} className="dashboard-cta dashboard-cta-primary md:col-span-2 w-full justify-center"><Wallet className="h-4 w-4" />Post Payment</button></div> : null}{mode === "invoice" ? <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Cycle</span><input value={invoice.cycle} onChange={(e) => setInvoice((p) => ({ ...p, cycle: e.target.value }))} className="members-input" /></label><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Amount</span><input value={invoice.amount} onChange={(e) => setInvoice((p) => ({ ...p, amount: e.target.value }))} className="members-input" /></label><label className="space-y-1"><span className="text-xs text-[var(--color-text-soft)]">Category</span><select value={invoice.category} onChange={(e) => setInvoice((p) => ({ ...p, category: e.target.value as TxCategory }))} className="members-select"><option value="rent">Rent</option><option value="mess">Mess</option><option value="utility">Utility</option><option value="fine">Fine</option><option value="other">Other</option></select></label><button type="button" onClick={runInvoice} className="dashboard-cta dashboard-cta-primary md:col-span-2 w-full justify-center"><FileText className="h-4 w-4" />Run Invoice</button></div> : null}</section> : null}

      <section className="panel panel-soft p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Immutable Payment Ledger</p><h2 className="mt-1 text-2xl font-semibold text-[var(--color-text-strong)]">Operational ledger table</h2></div><p className="text-sm text-[var(--color-text-muted)]">{(current - 1) * PAGE_SIZE + 1}-{Math.min(filtered.length, current * PAGE_SIZE)} of {filtered.length}</p></div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1180px] w-full border-separate border-spacing-y-2 text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Resident</th><th className="px-3 py-2">Room / Bed</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Dr / Cr</th><th className="px-3 py-2">Balance</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody>{pageRows.map((r) => <tr key={r.id}><td className="rounded-l-xl border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{fmtDate(r.date)}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}><p className="font-semibold text-[var(--color-text-strong)]">{r.resident}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{r.note}</p></td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{r.room}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{badge(r.type, "border-blue-400/30 bg-blue-500/10 text-blue-200")}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{badge(r.category, "border-slate-300/30 bg-white/5 text-slate-200")}</td><td className="border border-r-0 px-3 py-3 font-semibold" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{r.direction === "debit" ? "-" : "+"}${r.amount}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{r.direction === "debit" ? <span className="font-semibold text-rose-300">Debit</span> : <span className="font-semibold text-emerald-300">Credit</span>}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>${r.balance}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{badge(r.status, r.status === "overdue" ? "border-rose-400/35 bg-rose-500/12 text-rose-200" : "border-white/20 bg-white/6 text-slate-200")}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{r.id}</td><td className="relative rounded-r-xl border px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }} onClick={(e) => e.stopPropagation()}><div className="flex justify-end"><button type="button" onClick={() => setOpenMenuId((v) => (v === r.id ? null : r.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--color-text-soft)]"><EllipsisVertical className="h-4 w-4" /></button></div>{openMenuId === r.id ? <div className="absolute right-2 top-11 z-20 w-44 rounded-xl border border-white/12 bg-[#101a2b] p-2 shadow-[0_16px_40px_rgba(2,6,23,0.55)]"><button type="button" onClick={() => { setPay((p) => ({ ...p, reg: r.reg, amount: String(Math.max(1, r.balance > 0 ? r.balance : r.amount)) })); setMode("payment"); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[var(--color-text-soft)] hover:bg-white/8"><Wallet className="h-3.5 w-3.5" />Record payment</button><button type="button" onClick={() => { adjust(r); setOpenMenuId(null); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[var(--color-text-soft)] hover:bg-white/8"><NotebookPen className="h-3.5 w-3.5" />Add adjustment</button><button type="button" onClick={() => { reverse(r); setOpenMenuId(null); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[var(--color-text-soft)] hover:bg-white/8"><RefreshCcw className="h-3.5 w-3.5" />Reverse entry</button><button type="button" onClick={() => { setNotice(`Reminder queued for ${r.resident}.`); setOpenMenuId(null); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[var(--color-text-soft)] hover:bg-white/8"><Send className="h-3.5 w-3.5" />Send reminder</button></div> : null}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2"><button type="button" onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={current === 1} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 text-[var(--color-text-soft)] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-[var(--color-text-soft)]">Page {current} of {pages}</span><button type="button" onClick={() => setPage((n) => Math.min(pages, n + 1))} disabled={current === pages} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 text-[var(--color-text-soft)] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>
      </section>

      {showCollections ? <section className="panel panel-soft p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Collections</p><h2 className="mt-1 text-xl font-semibold text-[var(--color-text-strong)]">Overdue queue</h2></div><button type="button" onClick={() => setShowCollections(false)} className="dashboard-cta dashboard-cta-secondary py-1.5 text-xs"><X className="h-3.5 w-3.5" />Close</button></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{overdue.map((r) => <article key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-sm font-semibold text-[var(--color-text-strong)]">{r.resident}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{r.reg} · {r.room}</p><p className="mt-2 text-lg font-semibold text-rose-300">${r.amount}</p><button type="button" onClick={() => { setPay((p) => ({ ...p, reg: r.reg, amount: String(r.amount) })); setMode("payment"); }} className="dashboard-cta dashboard-cta-secondary mt-2 py-1.5 text-xs"><Wallet className="h-3.5 w-3.5" />Collect</button></article>)}</div></section> : null}
    </section>
  );
}
