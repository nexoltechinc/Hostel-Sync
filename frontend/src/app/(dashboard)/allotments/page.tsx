"use client";

import {
  ArrowUpRight,
  BedSingle,
  Filter,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useDeferredValue, useState } from "react";

type AllocationStatus = "active" | "reserved" | "vacated";
type BedStatus = "available" | "active" | "reserved" | "maintenance";
type WorkflowMode = "new" | "transfer" | "checkout" | null;

type BedRecord = { hostel: string; floor: string; room: string; bed: string; maintenance?: boolean };
type Allocation = {
  id: number;
  resident: string;
  reg: string;
  hostel: string;
  floor: string;
  room: string;
  bed: string;
  status: AllocationStatus;
  start: string;
  end: string | null;
};
type Conflict = { id: string; title: string; detail: string; room: string; bed: string; reg?: string };
type HistoryRow = { id: number; resident: string; trail: string; detail: string; date: string };

const beds: BedRecord[] = [
  { hostel: "North Block", floor: "2", room: "NB-204", bed: "A" },
  { hostel: "North Block", floor: "2", room: "NB-204", bed: "B" },
  { hostel: "North Block", floor: "2", room: "NB-207", bed: "A" },
  { hostel: "North Block", floor: "2", room: "NB-207", bed: "B" },
  { hostel: "North Block", floor: "3", room: "NB-311", bed: "A" },
  { hostel: "South Block", floor: "1", room: "SB-112", bed: "A" },
  { hostel: "South Block", floor: "1", room: "SB-118", bed: "A", maintenance: true },
  { hostel: "South Block", floor: "1", room: "SB-118", bed: "B" },
  { hostel: "West Wing", floor: "2", room: "WW-214", bed: "A" },
  { hostel: "West Wing", floor: "4", room: "WW-406", bed: "A" },
];

const seedAllocations: Allocation[] = [
  { id: 1, resident: "Areeba Malik", reg: "REG-1042", hostel: "North Block", floor: "2", room: "NB-204", bed: "A", status: "active", start: "2026-01-06", end: "2026-06-30" },
  { id: 2, resident: "Bilal Shah", reg: "REG-1155", hostel: "North Block", floor: "2", room: "NB-207", bed: "B", status: "reserved", start: "2026-04-05", end: "2026-09-30" },
  { id: 3, resident: "Ahmed Noor", reg: "REG-1232", hostel: "North Block", floor: "2", room: "NB-207", bed: "B", status: "reserved", start: "2026-04-09", end: "2026-08-30" },
  { id: 4, resident: "Hina Noor", reg: "REG-1181", hostel: "South Block", floor: "1", room: "SB-112", bed: "A", status: "active", start: "2026-02-14", end: "2026-08-31" },
  { id: 5, resident: "Sana Iqbal", reg: "REG-1218", hostel: "West Wing", floor: "4", room: "WW-406", bed: "A", status: "active", start: "2026-03-01", end: "2026-12-31" },
  { id: 6, resident: "Umar Farooq", reg: "REG-1209", hostel: "South Block", floor: "1", room: "SB-118", bed: "B", status: "vacated", start: "2025-10-01", end: "2026-03-24" },
];

const seedHistory: HistoryRow[] = [
  { id: 1, resident: "Areeba Malik", trail: "NB-103 Bed A -> NB-204 Bed A", detail: "Transfer completed", date: "2026-01-06" },
  { id: 2, resident: "Umar Farooq", trail: "SB-118 Bed B", detail: "Checkout completed", date: "2026-03-24" },
];

const FAR_END = "2099-12-31";

function parseIso(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, count: number) {
  const x = new Date(date);
  x.setDate(x.getDate() + count);
  return x;
}

function formatDate(value: string | null) {
  if (!value) return "Open";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(parseIso(value));
}

function rangesOverlap(startA: string, endA: string | null, startB: string, endB: string | null) {
  const a1 = parseIso(startA);
  const a2 = parseIso(endA ?? FAR_END);
  const b1 = parseIso(startB);
  const b2 = parseIso(endB ?? FAR_END);
  return a1 <= b2 && b1 <= a2;
}

function bedKey(room: string, bed: string) {
  return `${room}::${bed}`;
}

function detectConflicts(rows: Allocation[]) {
  const live = rows.filter((row) => row.status !== "vacated");
  const out: Conflict[] = [];
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i];
      const b = live[j];
      if (!rangesOverlap(a.start, a.end, b.start, b.end)) continue;
      if (a.room === b.room && a.bed === b.bed) {
        out.push({
          id: `bed-${a.id}-${b.id}`,
          title: `${a.room} Bed ${a.bed} overlap`,
          detail: `${a.reg} and ${b.reg} have overlapping occupancy dates.`,
          room: a.room,
          bed: a.bed,
        });
      }
      if (a.reg === b.reg) {
        out.push({
          id: `resident-${a.id}-${b.id}`,
          title: `${a.reg} has duplicate live allocations`,
          detail: `${a.resident} is allocated to multiple beds in overlapping windows.`,
          room: a.room,
          bed: a.bed,
          reg: a.reg,
        });
      }
    }
  }
  return out;
}

function runtimeStatus(
  bed: BedRecord,
  rows: Allocation[],
  todayIso: string,
  locked: Record<string, boolean>,
): BedStatus {
  if (bed.maintenance || locked[bedKey(bed.room, bed.bed)]) return "maintenance";
  const active = rows.some(
    (row) =>
      row.room === bed.room &&
      row.bed === bed.bed &&
      row.status === "active" &&
      rangesOverlap(todayIso, todayIso, row.start, row.end),
  );
  if (active) return "active";
  const reserved = rows.some(
    (row) =>
      row.room === bed.room &&
      row.bed === bed.bed &&
      row.status === "reserved" &&
      parseIso(row.start) >= parseIso(todayIso),
  );
  if (reserved) return "reserved";
  return "available";
}

export default function AllotmentsPage() {
  const todayIso = toIso(new Date());
  const [rows, setRows] = useState(seedAllocations);
  const [history, setHistory] = useState(seedHistory);
  const [lockedBeds, setLockedBeds] = useState<Record<string, boolean>>({});

  const [query, setQuery] = useState("");
  const [hostel, setHostel] = useState("all");
  const [floor, setFloor] = useState("all");
  const [room, setRoom] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"table" | "grid">("table");
  const [workflow, setWorkflow] = useState<WorkflowMode>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({ resident: "", reg: "", room: "NB-204", bed: "B", start: todayIso, end: "", status: "active" as AllocationStatus });
  const [transferForm, setTransferForm] = useState({ sourceId: 0, room: "NB-204", bed: "B", date: todayIso });
  const [checkoutForm, setCheckoutForm] = useState({ sourceId: 0, date: todayIso, maintenance: false });

  const deferredQuery = useDeferredValue(query);
  const search = deferredQuery.trim().toLowerCase();
  const conflicts = detectConflicts(rows);

  const hostels = Array.from(new Set(beds.map((item) => item.hostel)));
  const floors = Array.from(new Set(beds.filter((item) => hostel === "all" || item.hostel === hostel).map((item) => item.floor)));
  const rooms = Array.from(
    new Set(
      beds
        .filter((item) => (hostel === "all" || item.hostel === hostel) && (floor === "all" || item.floor === floor))
        .map((item) => item.room),
    ),
  );

  const filtered = rows.filter((row) => {
    const haystack = `${row.resident} ${row.reg} ${row.room} ${row.bed} ${row.hostel} ${row.floor}`.toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (hostel !== "all" && row.hostel !== hostel) return false;
    if (floor !== "all" && row.floor !== floor) return false;
    if (room !== "all" && row.room !== room) return false;
    if (status !== "all" && row.status !== status) return false;
    return true;
  });

  const occupiedBeds = beds.filter((item) => runtimeStatus(item, rows, todayIso, lockedBeds) === "active").length;
  const reservedBeds = beds.filter((item) => runtimeStatus(item, rows, todayIso, lockedBeds) === "reserved").length;
  const availableBeds = beds.filter((item) => runtimeStatus(item, rows, todayIso, lockedBeds) === "available").length;

  function resetFeed() {
    setNotice(null);
    setError(null);
  }

  function openWorkflow(mode: Exclude<WorkflowMode, null>) {
    resetFeed();
    setWorkflow(mode);
  }

  function createAllocation() {
    resetFeed();
    if (!newForm.resident.trim() || !newForm.reg.trim()) return setError("Resident and registration ID are required.");
    const target = beds.find((item) => item.room === newForm.room && item.bed === newForm.bed);
    if (!target) return setError("Invalid room/bed selection.");
    if (target.maintenance || lockedBeds[bedKey(target.room, target.bed)]) return setError("Selected bed is under maintenance.");
    const conflict = rows.find(
      (row) =>
        row.status !== "vacated" &&
        row.room === newForm.room &&
        row.bed === newForm.bed &&
        rangesOverlap(row.start, row.end, newForm.start, newForm.end || null),
    );
    if (conflict) return setError(`Conflict with ${conflict.reg} on ${newForm.room} Bed ${newForm.bed}.`);
    const entry: Allocation = {
      id: rows.length + 1,
      resident: newForm.resident.trim(),
      reg: newForm.reg.trim().toUpperCase(),
      hostel: target.hostel,
      floor: target.floor,
      room: target.room,
      bed: target.bed,
      status: newForm.status,
      start: newForm.start,
      end: newForm.end || null,
    };
    setRows((prev) => [entry, ...prev]);
    setHistory((prev) => [{ id: prev.length + 1, resident: entry.resident, trail: `${entry.room} Bed ${entry.bed}`, detail: "New allocation created", date: todayIso }, ...prev]);
    setNotice(`Allocation created for ${entry.resident}.`);
  }

  function transferResident() {
    resetFeed();
    const source = rows.find((row) => row.id === transferForm.sourceId && row.status !== "vacated");
    if (!source) return setError("Select a valid source allocation.");
    const target = beds.find((item) => item.room === transferForm.room && item.bed === transferForm.bed);
    if (!target) return setError("Invalid destination bed.");
    const overlap = rows.find(
      (row) =>
        row.id !== source.id &&
        row.status !== "vacated" &&
        row.room === transferForm.room &&
        row.bed === transferForm.bed &&
        rangesOverlap(row.start, row.end, transferForm.date, source.end),
    );
    if (overlap) return setError(`Destination overlaps with ${overlap.reg}.`);
    const sourceEnd = addDays(parseIso(transferForm.date), -1);
    const newEntry: Allocation = {
      id: rows.length + 1,
      resident: source.resident,
      reg: source.reg,
      hostel: target.hostel,
      floor: target.floor,
      room: target.room,
      bed: target.bed,
      status: parseIso(transferForm.date) > parseIso(todayIso) ? "reserved" : "active",
      start: transferForm.date,
      end: source.end,
    };
    setRows((prev) => prev.flatMap((row) => (row.id === source.id ? [{ ...row, status: "vacated", end: toIso(sourceEnd) }, newEntry] : [row])));
    setHistory((prev) => [{ id: prev.length + 1, resident: source.resident, trail: `${source.room} Bed ${source.bed} -> ${newEntry.room} Bed ${newEntry.bed}`, detail: "Transfer completed", date: todayIso }, ...prev]);
    setNotice(`Transfer completed for ${source.resident}.`);
  }

  function checkoutResident() {
    resetFeed();
    const source = rows.find((row) => row.id === checkoutForm.sourceId && row.status === "active");
    if (!source) return setError("Select an active allocation for checkout.");
    setRows((prev) => prev.map((row) => (row.id === source.id ? { ...row, status: "vacated", end: checkoutForm.date } : row)));
    if (checkoutForm.maintenance) setLockedBeds((prev) => ({ ...prev, [bedKey(source.room, source.bed)]: true }));
    setHistory((prev) => [{ id: prev.length + 1, resident: source.resident, trail: `${source.room} Bed ${source.bed}`, detail: "Checkout completed", date: todayIso }, ...prev]);
    setNotice(`Checkout completed for ${source.resident}.`);
  }

  return (
    <section className="space-y-6 pb-3">
      <section className="panel panel-soft panel-elevated p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-chip"><ShieldCheck className="h-3.5 w-3.5" />Conflict-safe engine</span>
          <span className="dashboard-chip"><Sparkles className="h-3.5 w-3.5" />Audit history online</span>
          <span className="dashboard-chip"><TriangleAlert className="h-3.5 w-3.5 text-rose-300" />{conflicts.length} live conflicts</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Room Allotment</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">Interactive control panel for allocations, transfers, checkout, conflict detection, and auditable timeline visibility.</p>

        <label className="members-command mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3">
          <Search className="h-5 w-5 text-[var(--color-text-muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resident, reg ID, room, or bed..." className="w-full bg-transparent text-sm text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-muted)]" />
        </label>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[{ id: "new", label: "New Allocation", icon: BedSingle }, { id: "transfer", label: "Transfer Resident", icon: RefreshCcw }, { id: "checkout", label: "Checkout Resident", icon: ArrowUpRight }].map((item) => {
            const Icon = item.icon;
            return <button key={item.id} type="button" onClick={() => openWorkflow(item.id as Exclude<WorkflowMode, null>)} className="dashboard-cta dashboard-cta-secondary justify-between"><span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" />{item.label}</span><ArrowUpRight className="h-4 w-4" /></button>;
          })}
        </div>
      </section>

      <section className="panel panel-soft p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <label><span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Hostel</span><select value={hostel} onChange={(e) => setHostel(e.target.value)} className="members-select py-2.5"><option value="all">All hostels</option>{hostels.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label><span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Floor</span><select value={floor} onChange={(e) => setFloor(e.target.value)} className="members-select py-2.5"><option value="all">All floors</option>{floors.map((x) => <option key={x} value={x}>Floor {x}</option>)}</select></label>
          <label><span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Room</span><select value={room} onChange={(e) => setRoom(e.target.value)} className="members-select py-2.5"><option value="all">All rooms</option>{rooms.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label><span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="members-select py-2.5"><option value="all">All statuses</option><option value="active">Active</option><option value="reserved">Reserved</option><option value="vacated">Vacated</option></select></label>
          <div className="flex items-end justify-end gap-2"><button type="button" onClick={() => { setHostel("all"); setFloor("all"); setRoom("all"); setStatus("all"); setQuery(""); }} className="dashboard-cta dashboard-cta-secondary py-2 text-xs"><Filter className="h-3.5 w-3.5" />Clear</button><div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--color-border)" }}><button type="button" onClick={() => setView("table")} className="rounded-full px-4 py-2 text-sm" style={view === "table" ? { background: "var(--nav-active-bg)", color: "#fff" } : { color: "var(--color-text-soft)" }}>Table</button><button type="button" onClick={() => setView("grid")} className="rounded-full px-4 py-2 text-sm" style={view === "grid" ? { background: "var(--nav-active-bg)", color: "#fff" } : { color: "var(--color-text-soft)" }}>Grid</button></div></div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <section className="panel panel-soft p-5 md:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rooms-overview-card"><p className="text-xs text-[var(--color-text-muted)]">Total Beds</p><p className="mt-1 text-2xl font-semibold text-[var(--color-text-strong)]">{beds.length}</p></article>
            <article className="rooms-overview-card"><p className="text-xs text-[var(--color-text-muted)]">Occupied Beds</p><p className="mt-1 text-2xl font-semibold text-sky-300">{occupiedBeds}</p></article>
            <article className="rooms-overview-card"><p className="text-xs text-[var(--color-text-muted)]">Available Beds</p><p className="mt-1 text-2xl font-semibold text-emerald-300">{availableBeds}</p><p className="text-xs text-[var(--color-text-muted)]">{reservedBeds} reserved</p></article>
          </div>

          {view === "table" ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-y-2 text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"><th className="px-3 py-2">Resident</th><th className="px-3 py-2">Reg ID</th><th className="px-3 py-2">Hostel/Floor</th><th className="px-3 py-2">Room/Bed</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th></tr></thead>
                <tbody>{filtered.map((row) => <tr key={row.id}><td className="rounded-l-xl border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}><p className="font-semibold text-[var(--color-text-strong)]">{row.resident}</p></td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{row.reg}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{row.hostel} · F{row.floor}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{row.room} / Bed {row.bed}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{row.status}</td><td className="border border-r-0 px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{formatDate(row.start)}</td><td className="rounded-r-xl border px-3 py-3" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{formatDate(row.end)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{beds.filter((item) => (hostel === "all" || item.hostel === hostel) && (floor === "all" || item.floor === floor) && (room === "all" || item.room === room)).map((item) => { const s = runtimeStatus(item, rows, todayIso, lockedBeds); return <article key={bedKey(item.room, item.bed)} className="rounded-xl border bg-white/5 p-3" style={{ borderColor: "var(--color-border)" }}><p className="text-sm font-semibold text-[var(--color-text-strong)]">{item.room} Bed {item.bed}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.hostel} · Floor {item.floor}</p><p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--color-text-soft)]">{s}</p></article>; })}</div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="panel panel-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Workflow Console</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">Interactive operations</h2>
            <div className="mt-3 inline-flex rounded-full border p-1" style={{ borderColor: "var(--color-border)" }}><button type="button" onClick={() => openWorkflow("new")} className="rounded-full px-3 py-1.5 text-xs" style={workflow === "new" ? { background: "var(--nav-active-bg)", color: "#fff" } : { color: "var(--color-text-soft)" }}>New</button><button type="button" onClick={() => openWorkflow("transfer")} className="rounded-full px-3 py-1.5 text-xs" style={workflow === "transfer" ? { background: "var(--nav-active-bg)", color: "#fff" } : { color: "var(--color-text-soft)" }}>Transfer</button><button type="button" onClick={() => openWorkflow("checkout")} className="rounded-full px-3 py-1.5 text-xs" style={workflow === "checkout" ? { background: "var(--nav-active-bg)", color: "#fff" } : { color: "var(--color-text-soft)" }}>Checkout</button></div>
            {notice ? <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</div> : null}
            {error ? <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}

            {workflow === "new" ? <div className="mt-3 space-y-2"><input placeholder="Resident" value={newForm.resident} onChange={(e) => setNewForm((p) => ({ ...p, resident: e.target.value }))} className="members-input" /><input placeholder="Reg ID" value={newForm.reg} onChange={(e) => setNewForm((p) => ({ ...p, reg: e.target.value }))} className="members-input" /><div className="grid grid-cols-2 gap-2"><select value={newForm.room} onChange={(e) => setNewForm((p) => ({ ...p, room: e.target.value, bed: beds.find((b) => b.room === e.target.value)?.bed ?? "A" }))} className="members-select">{Array.from(new Set(beds.filter((b) => !b.maintenance).map((b) => b.room))).map((x) => <option key={x} value={x}>{x}</option>)}</select><select value={newForm.bed} onChange={(e) => setNewForm((p) => ({ ...p, bed: e.target.value }))} className="members-select">{beds.filter((b) => b.room === newForm.room).map((b) => <option key={b.bed} value={b.bed}>Bed {b.bed}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><input type="date" value={newForm.start} onChange={(e) => setNewForm((p) => ({ ...p, start: e.target.value }))} className="members-input" /><input type="date" value={newForm.end} onChange={(e) => setNewForm((p) => ({ ...p, end: e.target.value }))} className="members-input" /></div><button type="button" onClick={createAllocation} className="dashboard-cta dashboard-cta-primary w-full justify-center"><BedSingle className="h-4 w-4" />Confirm Allocation</button></div> : null}

            {workflow === "transfer" ? <div className="mt-3 space-y-2"><select value={transferForm.sourceId} onChange={(e) => setTransferForm((p) => ({ ...p, sourceId: Number(e.target.value) }))} className="members-select"><option value={0}>Select source</option>{rows.filter((r) => r.status !== "vacated").map((r) => <option key={r.id} value={r.id}>{r.resident} ({r.reg}) · {r.room} Bed {r.bed}</option>)}</select><div className="grid grid-cols-2 gap-2"><select value={transferForm.room} onChange={(e) => setTransferForm((p) => ({ ...p, room: e.target.value, bed: beds.find((b) => b.room === e.target.value && !b.maintenance)?.bed ?? "A" }))} className="members-select">{Array.from(new Set(beds.filter((b) => !b.maintenance).map((b) => b.room))).map((x) => <option key={x} value={x}>{x}</option>)}</select><select value={transferForm.bed} onChange={(e) => setTransferForm((p) => ({ ...p, bed: e.target.value }))} className="members-select">{beds.filter((b) => b.room === transferForm.room && !b.maintenance).map((b) => <option key={b.bed} value={b.bed}>Bed {b.bed}</option>)}</select></div><input type="date" value={transferForm.date} onChange={(e) => setTransferForm((p) => ({ ...p, date: e.target.value }))} className="members-input" /><button type="button" onClick={transferResident} className="dashboard-cta dashboard-cta-primary w-full justify-center"><RefreshCcw className="h-4 w-4" />Confirm Transfer</button></div> : null}

            {workflow === "checkout" ? <div className="mt-3 space-y-2"><select value={checkoutForm.sourceId} onChange={(e) => setCheckoutForm((p) => ({ ...p, sourceId: Number(e.target.value) }))} className="members-select"><option value={0}>Select active stay</option>{rows.filter((r) => r.status === "active").map((r) => <option key={r.id} value={r.id}>{r.resident} ({r.reg}) · {r.room} Bed {r.bed}</option>)}</select><input type="date" value={checkoutForm.date} onChange={(e) => setCheckoutForm((p) => ({ ...p, date: e.target.value }))} className="members-input" /><label className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-[var(--color-text-soft)]"><input type="checkbox" checked={checkoutForm.maintenance} onChange={(e) => setCheckoutForm((p) => ({ ...p, maintenance: e.target.checked }))} className="h-4 w-4 accent-[#245df4]" />Mark bed maintenance</label><button type="button" onClick={checkoutResident} className="dashboard-cta dashboard-cta-primary w-full justify-center"><ArrowUpRight className="h-4 w-4" />Complete Checkout</button></div> : null}
          </section>

          <section className="panel panel-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Conflict Detection</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">Resolution-ready list</h2>
            <div className="mt-3 space-y-2">
              {conflicts.length === 0 ? <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">No conflict found.</div> : conflicts.map((c) => <article key={c.id} className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2"><p className="text-sm font-semibold text-[var(--color-text-strong)]">{c.title}</p><p className="mt-1 text-xs text-[var(--color-text-soft)]">{c.detail}</p></article>)}
            </div>
          </section>

          <section className="panel panel-soft p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Allocation History</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">Audit trail</h2>
            <div className="mt-3 space-y-2">{history.slice(0, 6).map((h) => <article key={h.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="text-sm font-semibold text-[var(--color-text-strong)]">{h.resident}</p><p className="mt-1 text-xs text-[var(--color-text-soft)]">{h.trail}</p><p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{h.detail} · {formatDate(h.date)}</p></article>)}</div>
          </section>
        </aside>
      </div>

      <section className="rounded-xl border p-5" style={{ borderColor: "rgba(239,68,68,0.22)", background: "linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(255,255,255,0.03) 100%)" }}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] text-white"><TriangleAlert className="h-4 w-4" /></span>
          <div><p className="text-sm font-semibold text-[var(--color-text-strong)]">Allocation engine note</p><p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">This layout now supports guided workflows, conflict-safe checks, row-level operations, and full audit visibility in one screen.</p></div>
        </div>
      </section>
    </section>
  );
}
