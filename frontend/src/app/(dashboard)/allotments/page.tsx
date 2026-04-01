"use client";

import { ArrowUpRight, BedDouble, BedSingle, RefreshCcw, Search, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { SectionHeading } from "@/components/ui/section-heading";
import { moduleIcons } from "@/lib/app-icons";

const tones = {
  blue: { solid: "#2563eb", soft: "#60a5fa", surface: "rgba(37,99,235,0.16)" },
  green: { solid: "#16a34a", soft: "#4ade80", surface: "rgba(22,163,74,0.16)" },
  orange: { solid: "#f08c2e", soft: "#f6c25d", surface: "rgba(240,140,46,0.16)" },
  red: { solid: "#ef4444", soft: "#fb7185", surface: "rgba(239,68,68,0.18)" },
} as const;

const quickActions = [
  { label: "New Allocation", desc: "Create a new time-based bed assignment.", icon: BedSingle, tone: tones.green },
  { label: "Transfer Resident", desc: "Close the current stay and create a new allocation.", icon: RefreshCcw, tone: tones.blue },
  { label: "Checkout Resident", desc: "Vacate the bed and complete release workflow.", icon: ArrowUpRight, tone: tones.orange },
] as const;

const kpis = [
  { title: "Total Beds", value: "128", note: "Gross hostel capacity", tone: tones.blue },
  { title: "Occupied Beds", value: "93", note: "Active allocations", tone: tones.blue },
  { title: "Available Beds", value: "23", note: "Ready for new residents", tone: tones.green },
  { title: "Reserved Beds", value: "8", note: "Held for upcoming arrivals", tone: tones.orange },
] as const;

const statusMeta = {
  available: { label: "Available", tone: tones.green, tip: "Bed is ready for assignment." },
  active: { label: "Active", tone: tones.blue, tip: "Bed is occupied by an active resident stay." },
  reserved: { label: "Reserved", tone: tones.orange, tip: "Bed is held for an upcoming resident." },
  vacated: { label: "Vacated", tone: tones.green, tip: "Allocation closed and bed released." },
  maintenance: { label: "Maintenance", tone: tones.red, tip: "Bed cannot be assigned until maintenance closes." },
} as const;

const allocations = [
  { resident: "Areeba Malik", reg: "REG-1042", hostel: "North Block · Floor 2", room: "NB-204 / Bed A", status: "active", start: "2026-01-06", end: "2026-06-30", duration: "176 days" },
  { resident: "Bilal Shah", reg: "REG-1155", hostel: "North Block · Floor 3", room: "NB-311 / Bed B", status: "reserved", start: "2026-04-02", end: "2026-09-30", duration: "181 days" },
  { resident: "Hina Noor", reg: "REG-1181", hostel: "South Block · Floor 1", room: "SB-112 / Bed A", status: "active", start: "2026-02-14", end: "2026-08-31", duration: "199 days" },
  { resident: "Umar Farooq", reg: "REG-1209", hostel: "South Block · Floor 1", room: "SB-118 / Bed B", status: "vacated", start: "2025-10-01", end: "2026-03-24", duration: "174 days" },
  { resident: "Sana Iqbal", reg: "REG-1218", hostel: "West Wing · Floor 4", room: "WW-406 / Bed A", status: "active", start: "2026-03-01", end: "2026-12-31", duration: "306 days" },
  { resident: "Ahmed Noor", reg: "REG-1232", hostel: "North Block · Floor 2", room: "NB-207 / Bed B", status: "reserved", start: "2026-04-05", end: "2026-09-30", duration: "178 days" },
  { resident: "Noor Fatima", reg: "REG-1264", hostel: "West Wing · Floor 2", room: "WW-214 / Bed A", status: "active", start: "2026-01-15", end: "2026-07-15", duration: "181 days" },
];

const roomGrid = [
  { room: "NB-204", floor: "F2", beds: [{ code: "A", status: "active" }, { code: "B", status: "available" }] },
  { room: "NB-207", floor: "F2", beds: [{ code: "A", status: "available" }, { code: "B", status: "reserved" }] },
  { room: "SB-118", floor: "F1", beds: [{ code: "A", status: "maintenance" }, { code: "B", status: "vacated" }] },
  { room: "WW-406", floor: "F4", beds: [{ code: "A", status: "active" }, { code: "B", status: "available" }] },
];

const conflicts = [
  "Reservation overlap detected for NB-207 Bed B on April 5, 2026.",
  "Resident REG-1155 is currently holding a reservation and cannot receive a second bed.",
];

const history = [
  { resident: "Areeba Malik", trail: "NB-103 / Bed A -> NB-204 / Bed A", dates: "Transfer on Jan 6, 2026" },
  { resident: "Umar Farooq", trail: "SB-118 / Bed B", dates: "Checkout on Mar 24, 2026" },
  { resident: "Noor Fatima", trail: "WW-109 / Bed B -> WW-214 / Bed A", dates: "Transfer on Jan 15, 2026" },
];

function badge(label: string, tone: (typeof tones)[keyof typeof tones], title: string) {
  return <span title={title} className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: tone.surface, backgroundColor: tone.surface, color: tone.soft }}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.solid }} />{label}</span>;
}

export default function AllotmentsPage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");
  const [hostel, setHostel] = useState("all");
  const [floor, setFloor] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const deferredQuery = useDeferredValue(query);
  const search = deferredQuery.trim().toLowerCase();
  const filteredAllocations = allocations.filter((entry) => {
    const haystack = `${entry.resident} ${entry.reg} ${entry.room}`.toLowerCase();
    return (!search || haystack.includes(search)) && (hostel === "all" || entry.hostel.startsWith(hostel)) && (floor === "all" || entry.hostel.includes(`Floor ${floor}`)) && (roomFilter === "all" || entry.room.startsWith(roomFilter)) && (status === "all" || entry.status === status) && (dateRange === "all" || (dateRange === "current" ? entry.status === "active" : entry.status === "reserved"));
  });

  return (
    <section className="space-y-6 pb-3">
      <section className="panel panel-soft panel-elevated relative overflow-hidden p-5 md:p-6 lg:p-7">
        <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(circle at 18% 16%, rgba(37,99,235,0.2), transparent 34%), radial-gradient(circle at 84% 14%, rgba(22,163,74,0.15), transparent 32%), radial-gradient(circle at 72% 100%, rgba(240,140,46,0.12), transparent 38%)" }} />
        <div className="relative space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className="dashboard-chip"><ShieldCheck className="h-3.5 w-3.5" />Conflict-safe engine</span>
            <span className="dashboard-chip"><Sparkles className="h-3.5 w-3.5" />Audit history online</span>
            <span className="dashboard-chip"><span className="status-dot bg-[var(--status-danger)] text-[var(--status-danger)]" />2 allocation conflicts</span>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.95fr)]">
            <SectionHeading icon={moduleIcons.allotments} eyebrow="Allocation Engine" title="Room Allotment" description="Manage bed assignments, transfers, reservations, and checkout with time-aware records, conflict validation, and full operational traceability." />
            <label className="flex min-h-[78px] items-center gap-3 rounded-[18px] border bg-[rgba(255,255,255,0.05)] px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
              <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Advanced Search</p>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resident, registration ID, or room number" className="mt-1 w-full bg-transparent text-sm text-[var(--color-text-strong)] outline-none placeholder:text-[var(--color-text-muted)]" />
                {deferredQuery ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">Searching for &quot;{deferredQuery}&quot;</p> : null}
              </div>
            </label>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" title={action.desc} className="rounded-[18px] border px-4 py-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: action.tone.surface, background: `linear-gradient(135deg, ${action.tone.surface} 0%, rgba(255,255,255,0.04) 100%)` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-semibold text-[var(--color-text-strong)]">{action.label}</p><p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">{action.desc}</p></div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border" style={{ borderColor: action.tone.surface, background: action.tone.surface, color: action.tone.soft }}><Icon className="h-4 w-4" /></span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((card) => <article key={card.title} className="rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-4" style={{ borderColor: "var(--color-border)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-[var(--color-text-soft)]">{card.title}</p><p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.05em] text-[var(--color-text-strong)]">{card.value}</p></div><span className="mt-1 inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: card.tone.solid }} /></div><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{card.note}</p></article>)}
            </div>
            <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => setView("table")} className="rounded-full px-4 py-2 text-sm font-medium" style={view === "table" ? { background: "var(--nav-active-bg)", color: "#fff" } : { color: "var(--color-text-soft)" }}>Table View</button>
              <button type="button" onClick={() => setView("grid")} className="rounded-full px-4 py-2 text-sm font-medium" style={view === "grid" ? { background: "var(--nav-active-bg)", color: "#fff" } : { color: "var(--color-text-soft)" }}>Grid View</button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)]">
        <section className="panel panel-soft p-5 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Transactional Allocation Table</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Time-aware occupancy records</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">Every allotment behaves like an immutable stay record. Changes happen through transfer or checkout workflows only.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[{ label: "Hostel", value: hostel, set: setHostel, options: [["all", "All hostels"], ["North Block", "North Block"], ["South Block", "South Block"], ["West Wing", "West Wing"]] }, { label: "Floor", value: floor, set: setFloor, options: [["all", "All floors"], ["1", "Floor 1"], ["2", "Floor 2"], ["3", "Floor 3"], ["4", "Floor 4"]] }, { label: "Room", value: roomFilter, set: setRoomFilter, options: [["all", "All rooms"], ["NB-204", "NB-204"], ["NB-207", "NB-207"], ["SB-118", "SB-118"], ["WW-406", "WW-406"]] }, { label: "Status", value: status, set: setStatus, options: [["all", "All statuses"], ["active", "Active"], ["reserved", "Reserved"], ["vacated", "Vacated"]] }, { label: "Date Range", value: dateRange, set: setDateRange, options: [["all", "All records"], ["current", "Current stays"], ["upcoming", "Upcoming arrivals"]] }].map((field) => <label key={field.label} className="space-y-1.5"><span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">{field.label}</span><select value={field.value} onChange={(event) => field.set(event.target.value)} className="w-full rounded-xl border bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-[var(--color-text-strong)] outline-none" style={{ borderColor: "var(--color-border)" }}>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
          </div>
          {view === "table" ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-[1040px] w-full border-separate border-spacing-y-3 text-sm">
                <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]"><th className="px-3 py-2">Resident Name</th><th className="px-3 py-2">Registration ID</th><th className="px-3 py-2">Hostel / Floor</th><th className="px-3 py-2">Room / Bed</th><th className="px-3 py-2">Allocation Status</th><th className="px-3 py-2">Start Date</th><th className="px-3 py-2">End Date</th><th className="px-3 py-2">Duration</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                <tbody>{filteredAllocations.map((entry) => <tr key={`${entry.reg}-${entry.room}`} className="align-top"><td className="rounded-l-xl border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}><p className="font-semibold text-[var(--color-text-strong)]">{entry.resident}</p><p className="mt-2 text-xs text-[var(--color-text-muted)]">Non-editable audit row</p></td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.reg}</td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.hostel}</td><td className="border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}><p className="text-base font-semibold text-[var(--color-text-strong)]">{entry.room}</p></td><td className="border border-r-0 px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{badge(statusMeta[entry.status as keyof typeof statusMeta].label, statusMeta[entry.status as keyof typeof statusMeta].tone, statusMeta[entry.status as keyof typeof statusMeta].tip)}</td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.start}</td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.end}</td><td className="border border-r-0 px-4 py-4 text-[var(--color-text-strong)]" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}>{entry.duration}</td><td className="rounded-r-xl border px-4 py-4" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.04)" }}><div className="flex flex-wrap justify-end gap-2"><button type="button" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: tones.blue.surface, background: tones.blue.surface, color: tones.blue.soft }}><RefreshCcw className="h-3.5 w-3.5" />Transfer</button><button type="button" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium" style={{ borderColor: tones.orange.surface, background: tones.orange.surface, color: tones.orange.soft }}><ArrowUpRight className="h-3.5 w-3.5" />Checkout</button></div></td></tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {roomGrid.map((roomItem) => <article key={roomItem.room} className="rounded-xl border bg-[rgba(255,255,255,0.04)] p-4 transition hover:border-[var(--color-border-strong)]" style={{ borderColor: "var(--color-border)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold text-[var(--color-text-strong)]">{roomItem.room}</p><p className="mt-1 text-sm text-[var(--color-text-soft)]">{roomItem.floor}</p></div><BedDouble className="h-4 w-4 text-[var(--color-text-muted)]" /></div><div className="mt-4 grid grid-cols-2 gap-3">{roomItem.beds.map((bed) => <div key={`${roomItem.room}-${bed.code}`} title={`${roomItem.room} Bed ${bed.code}`} className="rounded-xl border px-3 py-4" style={{ borderColor: statusMeta[bed.status as keyof typeof statusMeta].tone.surface, background: statusMeta[bed.status as keyof typeof statusMeta].tone.surface }}><p className="text-sm font-semibold text-[var(--color-text-strong)]">Bed {bed.code}</p><p className="mt-2 text-xs uppercase tracking-[0.18em]" style={{ color: statusMeta[bed.status as keyof typeof statusMeta].tone.soft }}>{statusMeta[bed.status as keyof typeof statusMeta].label}</p></div>)}</div></article>)}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="panel panel-soft p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Conflict Detection</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Real-time validation</h2><div className="mt-5 space-y-3">{conflicts.map((conflict) => <div key={conflict} className="rounded-xl border bg-[rgba(239,68,68,0.08)] px-4 py-4 text-sm text-[var(--color-text-soft)]" style={{ borderColor: tones.red.surface }}>{conflict}</div>)}</div></section>
          <section className="panel panel-soft p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Transfer Workflow</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Step-based move flow</h2><div className="mt-5 grid gap-3">{["Select Resident", "Display Current", "Select New", "Confirm"].map((step, index) => <div key={step} className="rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3" style={{ borderColor: "var(--color-border)" }}><p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Step {index + 1}</p><p className="mt-1 text-sm font-semibold text-[var(--color-text-strong)]">{step}</p></div>)}</div></section>
          <section className="panel panel-soft p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Checkout Process</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Structured release flow</h2><div className="mt-5 grid gap-3">{["Set checkout date", "Update stay to vacated", "Release bed to available"].map((step) => <div key={step} className="rounded-xl border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[var(--color-text-soft)]" style={{ borderColor: "var(--color-border)" }}>{step}</div>)}</div></section>
          <section className="panel panel-soft p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Allocation History</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Resident move trail</h2><div className="mt-5 space-y-3">{history.map((item) => <article key={item.resident + item.trail} className="rounded-xl border bg-[rgba(255,255,255,0.04)] p-4" style={{ borderColor: "var(--color-border)" }}><p className="text-sm font-semibold text-[var(--color-text-strong)]">{item.resident}</p><p className="mt-2 text-sm text-[var(--color-text-soft)]">{item.trail}</p><p className="mt-2 text-xs text-[var(--color-text-muted)]">{item.dates}</p></article>)}</div></section>
        </div>
      </div>

      <section className="rounded-xl border p-5" style={{ borderColor: tones.red.surface, background: "linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(255,255,255,0.03) 100%)" }}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] text-white"><TriangleAlert className="h-4 w-4" /></span>
          <div><p className="text-sm font-semibold text-[var(--color-text-strong)]">Allocation engine note</p><p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">The final layout will make every assignment auditable, conflict-safe, and time-aware by design.</p></div>
        </div>
      </section>
    </section>
  );
}
