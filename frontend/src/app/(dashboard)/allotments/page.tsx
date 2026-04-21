"use client";

import {
  ArrowRightLeft,
  BedSingle,
  ChevronRight,
  Download,
  DoorOpen,
  Eye,
  FilterX,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useDeferredValue, useState, type KeyboardEvent } from "react";

import { ExportColumnModal } from "@/components/ui/export-column-modal";
import { exportWorkbookToExcel, type ExportColumnDefinition } from "@/lib/export";

type AllocationStatus = "active" | "reserved" | "vacated";
type BedStatus = "available" | "active" | "reserved" | "maintenance";
type WorkflowMode = "new" | "transfer" | "checkout" | "edit" | null;
type BadgeTone = "success" | "warning" | "danger" | "neutral";

type BedRecord = {
  hostel: string;
  floor: string;
  room: string;
  bed: string;
  maintenance?: boolean;
};

type BedSelection = Pick<BedRecord, "hostel" | "floor" | "room" | "bed">;

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

type Conflict = {
  id: string;
  type: "Bed overlap" | "Duplicate allocation";
  summary: string;
  room: string;
  bed: string;
  allocationIds: number[];
  residents: string[];
  regs: string[];
};

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

const FAR_END = "2099-12-31";
const defaultOperationalBed = beds.find((item) => !item.maintenance) ?? beds[0];

function selectionFromBed(item: BedRecord): BedSelection {
  return {
    hostel: item.hostel,
    floor: item.floor,
    room: item.room,
    bed: item.bed,
  };
}

function parseDateOnly(value: string) {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parseDateOnly(value));
}

function rangesOverlap(startA: string, endA: string | null, startB: string, endB: string | null) {
  const a1 = parseDateOnly(startA);
  const a2 = parseDateOnly(endA ?? FAR_END);
  const b1 = parseDateOnly(startB);
  const b2 = parseDateOnly(endB ?? FAR_END);
  return a1 <= b2 && b1 <= a2;
}

function bedKey(room: string, bed: string) {
  return `${room}::${bed}`;
}

function detectConflicts(rows: Allocation[]) {
  const liveRows = rows.filter((row) => row.status !== "vacated");
  const items: Conflict[] = [];

  for (let index = 0; index < liveRows.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < liveRows.length; compareIndex += 1) {
      const first = liveRows[index];
      const second = liveRows[compareIndex];

      if (!rangesOverlap(first.start, first.end, second.start, second.end)) {
        continue;
      }

      if (first.room === second.room && first.bed === second.bed) {
        items.push({
          id: `bed-${first.id}-${second.id}`,
          type: "Bed overlap",
          summary: `${first.room} Bed ${first.bed} is assigned to multiple residents in overlapping dates.`,
          room: first.room,
          bed: first.bed,
          allocationIds: [first.id, second.id],
          residents: [first.resident, second.resident],
          regs: [first.reg, second.reg],
        });
      }

      if (first.reg === second.reg) {
        items.push({
          id: `resident-${first.id}-${second.id}`,
          type: "Duplicate allocation",
          summary: `${first.resident} has overlapping live allocations across multiple beds.`,
          room: first.room,
          bed: first.bed,
          allocationIds: [first.id, second.id],
          residents: [first.resident, second.resident],
          regs: [first.reg, second.reg],
        });
      }
    }
  }

  return items;
}

function runtimeStatus(bed: BedRecord, rows: Allocation[], todayIso: string, locked: Record<string, boolean>): BedStatus {
  if (bed.maintenance || locked[bedKey(bed.room, bed.bed)]) {
    return "maintenance";
  }

  const active = rows.some(
    (row) =>
      row.room === bed.room &&
      row.bed === bed.bed &&
      row.status === "active" &&
      rangesOverlap(todayIso, todayIso, row.start, row.end),
  );

  if (active) {
    return "active";
  }

  const reserved = rows.some(
    (row) =>
      row.room === bed.room &&
      row.bed === bed.bed &&
      row.status === "reserved" &&
      parseDateOnly(row.end ?? FAR_END) >= parseDateOnly(todayIso),
  );

  if (reserved) {
    return "reserved";
  }

  return "available";
}

function statusMeta(status: AllocationStatus, isConflicted: boolean) {
  if (isConflicted) {
    return {
      tone: "danger" as BadgeTone,
      label: "Conflict",
      detail: "Action required",
    };
  }

  if (status === "active") {
    return {
      tone: "success" as BadgeTone,
      label: "Active",
      detail: "Current stay",
    };
  }

  if (status === "reserved") {
    return {
      tone: "warning" as BadgeTone,
      label: "Reserved",
      detail: "Upcoming stay",
    };
  }

  return {
    tone: "neutral" as BadgeTone,
    label: "Completed",
    detail: "Checkout recorded",
  };
}

function allocationStatusLabel(status: AllocationStatus) {
  if (status === "active") {
    return "Active";
  }

  if (status === "reserved") {
    return "Reserved";
  }

  return "Completed";
}

function SectionBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className="allotment-badge" data-tone={tone}>
      {label}
    </span>
  );
}

function buildAllocationExportColumns(conflictAllocationIds: Set<number>): ExportColumnDefinition<Allocation>[] {
  return [
    {
      id: "resident",
      label: "Resident",
      description: "Allocation sheet: resident full name.",
      width: 22,
      getValue: (row) => row.resident,
    },
    {
      id: "registration_id",
      label: "Registration ID",
      description: "Allocation sheet: resident registration code.",
      width: 18,
      getValue: (row) => row.reg,
    },
    {
      id: "hostel",
      label: "Hostel",
      description: "Allocation sheet: hostel or block name.",
      width: 18,
      getValue: (row) => row.hostel,
    },
    {
      id: "floor",
      label: "Floor",
      description: "Allocation sheet: floor reference.",
      width: 14,
      getValue: (row) => `Floor ${row.floor}`,
    },
    {
      id: "room",
      label: "Room",
      description: "Allocation sheet: room code.",
      width: 14,
      getValue: (row) => row.room,
    },
    {
      id: "bed",
      label: "Bed",
      description: "Allocation sheet: bed label within the room.",
      width: 12,
      getValue: (row) => `Bed ${row.bed}`,
    },
    {
      id: "status",
      label: "Status",
      description: "Allocation sheet: allocation lifecycle status.",
      width: 14,
      getValue: (row) => allocationStatusLabel(row.status),
    },
    {
      id: "conflict_flag",
      label: "Conflict Flag",
      description: "Allocation sheet: indicates overlapping or conflicted records.",
      kind: "boolean",
      width: 14,
      getValue: (row) => conflictAllocationIds.has(row.id),
    },
    {
      id: "start_date",
      label: "Start Date",
      description: "Allocation sheet: allocation start date.",
      kind: "date",
      width: 16,
      getValue: (row) => row.start,
    },
    {
      id: "end_date",
      label: "End Date",
      description: "Allocation sheet: allocation end or checkout date.",
      kind: "date",
      width: 16,
      getValue: (row) => row.end,
    },
  ];
}

const CONFLICT_EXPORT_COLUMNS: ExportColumnDefinition<Conflict>[] = [
  {
    id: "conflict_type",
    label: "Conflict Type",
    description: "Conflicts sheet: detected issue category.",
    width: 20,
    getValue: (row) => row.type,
  },
  {
    id: "conflict_room",
    label: "Room",
    description: "Conflicts sheet: affected room code.",
    width: 14,
    getValue: (row) => row.room,
  },
  {
    id: "conflict_bed",
    label: "Bed",
    description: "Conflicts sheet: affected bed label.",
    width: 12,
    getValue: (row) => `Bed ${row.bed}`,
  },
  {
    id: "conflict_summary",
    label: "Summary",
    description: "Conflicts sheet: operational issue summary.",
    width: 38,
    getValue: (row) => row.summary,
  },
  {
    id: "conflict_residents",
    label: "Residents",
    description: "Conflicts sheet: residents involved in the issue.",
    width: 30,
    getValue: (row) => row.residents.join(", "),
  },
  {
    id: "conflict_regs",
    label: "Registration IDs",
    description: "Conflicts sheet: registration references involved in the issue.",
    width: 28,
    getValue: (row) => row.regs.join(" / "),
  },
  {
    id: "conflict_allocation_ids",
    label: "Allocation IDs",
    description: "Conflicts sheet: linked allocation record IDs.",
    width: 22,
    getValue: (row) => row.allocationIds.join(", "),
  },
];

export default function AllotmentsPage() {
  const todayIso = toIso(new Date());
  const [rows, setRows] = useState(seedAllocations);
  const [lockedBeds, setLockedBeds] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [hostel, setHostel] = useState("all");
  const [floor, setFloor] = useState("all");
  const [room, setRoom] = useState("all");
  const [status, setStatus] = useState("all");
  const [workflow, setWorkflow] = useState<WorkflowMode>(null);
  const [selectedAllocationId, setSelectedAllocationId] = useState<number | null>(seedAllocations[0]?.id ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedAllocationExportColumnIds, setSelectedAllocationExportColumnIds] = useState<string[]>(
    buildAllocationExportColumns(new Set())
      .filter((column) => column.defaultSelected !== false)
      .map((column) => column.id),
  );
  const [newForm, setNewForm] = useState({
    resident: "",
    reg: "",
    ...selectionFromBed(defaultOperationalBed),
    start: todayIso,
    end: "",
    status: "active" as AllocationStatus,
  });
  const [transferForm, setTransferForm] = useState({
    sourceId: seedAllocations.find((row) => row.status !== "vacated")?.id ?? 0,
    ...selectionFromBed(defaultOperationalBed),
    date: todayIso,
  });
  const [checkoutForm, setCheckoutForm] = useState({
    sourceId: seedAllocations.find((row) => row.status === "active")?.id ?? 0,
    date: todayIso,
    maintenance: false,
  });
  const [editForm, setEditForm] = useState({
    sourceId: seedAllocations[0]?.id ?? 0,
    start: seedAllocations[0]?.start ?? todayIso,
    end: seedAllocations[0]?.end ?? "",
    status: seedAllocations[0]?.status ?? ("active" as AllocationStatus),
  });

  const deferredQuery = useDeferredValue(query);
  const search = deferredQuery.trim().toLowerCase();
  const conflicts = detectConflicts(rows);
  const conflictAllocationIds = new Set(conflicts.flatMap((item) => item.allocationIds));
  const selectedAllocation = rows.find((row) => row.id === selectedAllocationId) ?? null;
  const allocationExportColumns = buildAllocationExportColumns(conflictAllocationIds);
  const allocationExportColumnOptions = allocationExportColumns.map(({ id, label, description }) => ({
    id,
    label,
    description,
  }));

  const hostels = Array.from(new Set(beds.map((item) => item.hostel)));
  const floors = Array.from(new Set(beds.filter((item) => hostel === "all" || item.hostel === hostel).map((item) => item.floor)));
  const rooms = Array.from(
    new Set(
      beds
        .filter((item) => (hostel === "all" || item.hostel === hostel) && (floor === "all" || item.floor === floor))
        .map((item) => item.room),
    ),
  );

  const filteredRows = rows.filter((row) => {
    const haystack = `${row.resident} ${row.reg} ${row.room} ${row.bed} ${row.hostel} ${row.floor}`.toLowerCase();
    if (search && !haystack.includes(search)) {
      return false;
    }
    if (hostel !== "all" && row.hostel !== hostel) {
      return false;
    }
    if (floor !== "all" && row.floor !== floor) {
      return false;
    }
    if (room !== "all" && row.room !== room) {
      return false;
    }
    if (status !== "all" && row.status !== status) {
      return false;
    }
    return true;
  });

  const occupiedBeds = beds.filter((item) => runtimeStatus(item, rows, todayIso, lockedBeds) === "active").length;
  const reservedBeds = beds.filter((item) => runtimeStatus(item, rows, todayIso, lockedBeds) === "reserved").length;
  const availableBeds = beds.filter((item) => runtimeStatus(item, rows, todayIso, lockedBeds) === "available").length;

  function resetFeedback() {
    setNotice(null);
    setError(null);
  }

  function candidateBeds(excludedKey?: string) {
    const available = beds.filter(
      (item) => !item.maintenance && !lockedBeds[bedKey(item.room, item.bed)] && bedKey(item.room, item.bed) !== excludedKey,
    );

    if (available.length > 0) {
      return available;
    }

    return beds.filter((item) => !item.maintenance && bedKey(item.room, item.bed) !== excludedKey);
  }

  function firstUsableBed(excludedKey?: string) {
    return candidateBeds(excludedKey)[0] ?? defaultOperationalBed;
  }

  function selectableHostels(excludedKey?: string) {
    return Array.from(new Set(candidateBeds(excludedKey).map((item) => item.hostel)));
  }

  function selectableFloorsForHostel(hostelCode: string, excludedKey?: string) {
    return Array.from(new Set(candidateBeds(excludedKey).filter((item) => item.hostel === hostelCode).map((item) => item.floor)));
  }

  function selectableRoomsForFloor(hostelCode: string, floorCode: string, excludedKey?: string) {
    return Array.from(
      new Set(candidateBeds(excludedKey).filter((item) => item.hostel === hostelCode && item.floor === floorCode).map((item) => item.room)),
    );
  }

  function selectableBedsForSelection(hostelCode: string, floorCode: string, roomCode: string, excludedKey?: string) {
    return candidateBeds(excludedKey).filter(
      (item) => item.hostel === hostelCode && item.floor === floorCode && item.room === roomCode,
    );
  }

  function normalizeBedSelection(selection: Partial<BedSelection>, excludedKey?: string): BedSelection {
    const options = candidateBeds(excludedKey);
    const fallback = options[0] ?? defaultOperationalBed;

    const hostelCode =
      selection.hostel && options.some((item) => item.hostel === selection.hostel) ? selection.hostel : fallback.hostel;
    const hostelOptions = options.filter((item) => item.hostel === hostelCode);

    const floorCode =
      selection.floor && hostelOptions.some((item) => item.floor === selection.floor)
        ? selection.floor
        : (hostelOptions[0] ?? fallback).floor;
    const floorOptions = hostelOptions.filter((item) => item.floor === floorCode);

    const roomCode =
      selection.room && floorOptions.some((item) => item.room === selection.room)
        ? selection.room
        : (floorOptions[0] ?? hostelOptions[0] ?? fallback).room;
    const roomOptions = floorOptions.filter((item) => item.room === roomCode);

    const bedCode =
      selection.bed && roomOptions.some((item) => item.bed === selection.bed)
        ? selection.bed
        : (roomOptions[0] ?? floorOptions[0] ?? hostelOptions[0] ?? fallback).bed;

    return {
      hostel: hostelCode,
      floor: floorCode,
      room: roomCode,
      bed: bedCode,
    };
  }

  function syncNewFormSelection(selection: Partial<BedSelection>) {
    setNewForm((current) => ({
      ...current,
      ...normalizeBedSelection(
        {
          hostel: current.hostel,
          floor: current.floor,
          room: current.room,
          bed: current.bed,
          ...selection,
        },
      ),
    }));
  }

  function syncTransferFormSelection(selection: Partial<BedSelection>, sourceId = transferForm.sourceId) {
    const source = rows.find((row) => row.id === sourceId && row.status !== "vacated");
    const excludedKey = source ? bedKey(source.room, source.bed) : undefined;

    setTransferForm((current) => ({
      ...current,
      sourceId,
      ...normalizeBedSelection(
        {
          hostel: current.hostel,
          floor: current.floor,
          room: current.room,
          bed: current.bed,
          ...selection,
        },
        excludedKey,
      ),
    }));
  }

  function clearFilters() {
    setHostel("all");
    setFloor("all");
    setRoom("all");
    setStatus("all");
    setQuery("");
  }

  function scrollToSection(sectionId: string) {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function openNewAllocation() {
    const candidate = firstUsableBed();
    resetFeedback();
    setWorkflow("new");
    setNewForm({
      resident: "",
      reg: "",
      ...selectionFromBed(candidate),
      start: todayIso,
      end: "",
      status: "active",
    });
  }

  function openTransferWorkflow(allocationId?: number) {
    const source = rows.find((row) => row.id === (allocationId ?? selectedAllocationId) && row.status !== "vacated");
    const candidate = firstUsableBed(source ? bedKey(source.room, source.bed) : undefined);
    resetFeedback();
    setWorkflow("transfer");
    if (source) {
      setSelectedAllocationId(source.id);
      setTransferForm({
        sourceId: source.id,
        ...selectionFromBed(candidate),
        date: todayIso,
      });
    }
  }

  function openCheckoutWorkflow(allocationId?: number) {
    const source = rows.find((row) => row.id === (allocationId ?? selectedAllocationId) && row.status === "active");
    resetFeedback();
    setWorkflow("checkout");
    if (source) {
      setSelectedAllocationId(source.id);
      setCheckoutForm({
        sourceId: source.id,
        date: todayIso,
        maintenance: false,
      });
    }
  }

  function openEditWorkflow(allocationId: number) {
    const source = rows.find((row) => row.id === allocationId);
    if (!source) {
      return;
    }

    resetFeedback();
    setSelectedAllocationId(source.id);
    setWorkflow("edit");
    setEditForm({
      sourceId: source.id,
      start: source.start,
      end: source.end ?? "",
      status: source.status,
    });
  }

  function viewAllocation(allocationId: number) {
    resetFeedback();
    setSelectedAllocationId(allocationId);
    setWorkflow(null);
  }

  function openExportModal() {
    if (filteredRows.length === 0) {
      setNotice("No filtered allocations are available to export.");
      setError(null);
      return;
    }

    setIsExportModalOpen(true);
  }

  function toggleAllocationExportColumn(columnId: string) {
    setSelectedAllocationExportColumnIds((current) =>
      current.includes(columnId) ? current.filter((item) => item !== columnId) : [...current, columnId],
    );
  }

  function resetAllocationExportColumns() {
    setSelectedAllocationExportColumnIds(
      allocationExportColumns.filter((column) => column.defaultSelected !== false).map((column) => column.id),
    );
  }

  function selectAllAllocationExportColumns() {
    setSelectedAllocationExportColumnIds(allocationExportColumns.map((column) => column.id));
  }

  function confirmAllocationExport() {
    const selectedColumns = allocationExportColumns.filter((column) =>
      selectedAllocationExportColumnIds.includes(column.id),
    );

    if (selectedColumns.length === 0) {
      setError("Select at least one allocation column before exporting.");
      setNotice(null);
      return;
    }

    exportWorkbookToExcel({
      fileName: `allocation-workbook-${new Date().toISOString().slice(0, 10)}`,
      sheets: [
        {
          filters: [
            { label: "Search", value: query.trim() || "All allocations" },
            { label: "Hostel Filter", value: hostel === "all" ? "All hostels" : hostel },
            { label: "Floor Filter", value: floor === "all" ? "All floors" : `Floor ${floor}` },
            { label: "Room Filter", value: room === "all" ? "All rooms" : room },
            { label: "Status Filter", value: status === "all" ? "All statuses" : allocationStatusLabel(status as AllocationStatus) },
          ],
          sheetName: "Overview",
          subtitle: "Operational allocation workbook with filtered resident assignments and conflict coverage.",
          summary: [
            { kind: "number", label: "Filtered Allocations", value: filteredRows.length },
            {
              helper: "Currently occupied and active resident stays.",
              kind: "number",
              label: "Active Allocations",
              value: filteredRows.filter((row) => row.status === "active").length,
            },
            {
              helper: "Upcoming reserved or held allocations.",
              kind: "number",
              label: "Reserved Allocations",
              value: filteredRows.filter((row) => row.status === "reserved").length,
            },
            {
              helper: "Completed or vacated records in the current filtered set.",
              kind: "number",
              label: "Completed Allocations",
              value: filteredRows.filter((row) => row.status === "vacated").length,
            },
            {
              helper: "Detected overlapping or duplicate live allocation conflicts.",
              kind: "number",
              label: "Open Conflicts",
              value: conflicts.length,
            },
            {
              helper: "Beds currently ready for new allocation activity.",
              kind: "number",
              label: "Available Beds",
              value: availableBeds,
            },
          ],
          title: "Allotment Workbook Overview",
        },
        {
          columns: selectedColumns,
          filters: [
            { label: "Search", value: query.trim() || "All allocations" },
            { label: "Hostel Filter", value: hostel === "all" ? "All hostels" : hostel },
            { label: "Floor Filter", value: floor === "all" ? "All floors" : `Floor ${floor}` },
            { label: "Room Filter", value: room === "all" ? "All rooms" : room },
            { label: "Status Filter", value: status === "all" ? "All statuses" : allocationStatusLabel(status as AllocationStatus) },
          ],
          rows: filteredRows,
          sheetName: "Allocations",
          subtitle: "Filtered allocation records prepared for management review and operational follow-up.",
          summary: [
            { kind: "number", label: "Exported Allocations", value: filteredRows.length },
            { kind: "number", label: "Conflict-Flagged Rows", value: filteredRows.filter((row) => conflictAllocationIds.has(row.id)).length },
          ],
          title: "Allocation Records",
        },
        {
          columns: CONFLICT_EXPORT_COLUMNS,
          rows: conflicts,
          sheetName: "Conflicts",
          subtitle: "Conflict queue snapshot generated from the live allotment board.",
          summary: [
            { kind: "number", label: "Conflict Count", value: conflicts.length },
          ],
          title: "Allocation Conflicts",
        },
      ],
      subject: "Hostel room allotment export",
      title: "Allotment Workbook",
    });

    setNotice(
      `Allocation Excel exported successfully with ${filteredRows.length} filtered records and ${selectedColumns.length} selected columns.`,
    );
    setError(null);
    setIsExportModalOpen(false);
  }

  function handleAllocationKeyDown(event: KeyboardEvent<HTMLElement>, allocationId: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      viewAllocation(allocationId);
    }
  }

  function createAllocation() {
    resetFeedback();

    if (!newForm.resident.trim() || !newForm.reg.trim()) {
      setError("Resident name and registration ID are required.");
      return;
    }

    if (newForm.end && parseDateOnly(newForm.end) < parseDateOnly(newForm.start)) {
      setError("End date must be after the start date.");
      return;
    }

    const target = beds.find(
      (item) =>
        item.hostel === newForm.hostel &&
        item.floor === newForm.floor &&
        item.room === newForm.room &&
        item.bed === newForm.bed,
    );
    if (!target) {
      setError("Select a valid room and bed.");
      return;
    }

    if (target.maintenance || lockedBeds[bedKey(target.room, target.bed)]) {
      setError("The selected bed is unavailable for allocation.");
      return;
    }

    const overlapping = rows.find(
      (row) =>
        row.status !== "vacated" &&
        row.room === target.room &&
        row.bed === target.bed &&
        rangesOverlap(row.start, row.end, newForm.start, newForm.end || null),
    );

    if (overlapping) {
      setError(`This bed is already assigned to ${overlapping.resident} in the selected date range.`);
      return;
    }

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

    setRows((current) => [entry, ...current]);
    setSelectedAllocationId(entry.id);
    setNotice(`Allocation created for ${entry.resident}.`);
  }

  function transferResident() {
    resetFeedback();

    const source = rows.find((row) => row.id === transferForm.sourceId && row.status !== "vacated");
    if (!source) {
      setError("Select a live allocation to transfer.");
      return;
    }

    if (parseDateOnly(transferForm.date) < parseDateOnly(source.start)) {
      setError("Transfer date cannot be earlier than the current allocation start date.");
      return;
    }

    const target = beds.find(
      (item) =>
        item.hostel === transferForm.hostel &&
        item.floor === transferForm.floor &&
        item.room === transferForm.room &&
        item.bed === transferForm.bed,
    );
    if (!target) {
      setError("Select a valid destination bed.");
      return;
    }

    if (bedKey(target.room, target.bed) === bedKey(source.room, source.bed)) {
      setError("Choose a different bed for the transfer.");
      return;
    }

    if (target.maintenance || lockedBeds[bedKey(target.room, target.bed)]) {
      setError("The selected destination bed is unavailable.");
      return;
    }

    const overlapping = rows.find(
      (row) =>
        row.id !== source.id &&
        row.status !== "vacated" &&
        row.room === transferForm.room &&
        row.bed === transferForm.bed &&
        rangesOverlap(row.start, row.end, transferForm.date, source.end),
    );

    if (overlapping) {
      setError(`Destination bed already overlaps with ${overlapping.resident}.`);
      return;
    }

    const sourceEnd = addDays(parseDateOnly(transferForm.date), -1);
    const nextEntry: Allocation = {
      id: rows.length + 1,
      resident: source.resident,
      reg: source.reg,
      hostel: target.hostel,
      floor: target.floor,
      room: target.room,
      bed: target.bed,
      status: parseDateOnly(transferForm.date) > parseDateOnly(todayIso) ? "reserved" : "active",
      start: transferForm.date,
      end: source.end,
    };

    setRows((current) =>
      current.flatMap((row) => (row.id === source.id ? [{ ...row, status: "vacated", end: toIso(sourceEnd) }, nextEntry] : [row])),
    );
    setSelectedAllocationId(nextEntry.id);
    setNotice(`Transfer completed for ${source.resident}.`);
  }

  function checkoutResident() {
    resetFeedback();

    const source = rows.find((row) => row.id === checkoutForm.sourceId && row.status === "active");
    if (!source) {
      setError("Select an active allocation for checkout.");
      return;
    }

    if (parseDateOnly(checkoutForm.date) < parseDateOnly(source.start)) {
      setError("Checkout date cannot be earlier than the allocation start date.");
      return;
    }

    setRows((current) => current.map((row) => (row.id === source.id ? { ...row, status: "vacated", end: checkoutForm.date } : row)));

    if (checkoutForm.maintenance) {
      setLockedBeds((current) => ({
        ...current,
        [bedKey(source.room, source.bed)]: true,
      }));
    }

    setSelectedAllocationId(source.id);
    setNotice(`Checkout completed for ${source.resident}.`);
  }

  function updateAllocation() {
    resetFeedback();

    const source = rows.find((row) => row.id === editForm.sourceId);
    if (!source) {
      setError("Select an allocation to edit.");
      return;
    }

    if (editForm.end && parseDateOnly(editForm.end) < parseDateOnly(editForm.start)) {
      setError("End date must be after the start date.");
      return;
    }

    if (
      editForm.status !== "vacated" &&
      rows.some(
        (row) =>
          row.id !== source.id &&
          row.status !== "vacated" &&
          row.room === source.room &&
          row.bed === source.bed &&
          rangesOverlap(row.start, row.end, editForm.start, editForm.end || null),
      )
    ) {
      setError("The edited dates create an overlap for the selected bed.");
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === source.id
          ? {
              ...row,
              start: editForm.start,
              end: editForm.end || null,
              status: editForm.status,
            }
          : row,
      ),
    );
    setSelectedAllocationId(source.id);
    setNotice(`Allocation updated for ${source.resident}.`);
  }

  function resolveConflict(conflict: Conflict) {
    const targetId = conflict.allocationIds[conflict.allocationIds.length - 1];
    viewAllocation(targetId);
    openTransferWorkflow(targetId);
    setNotice(`Open transfer or edit actions to resolve ${conflict.type.toLowerCase()} for ${conflict.regs.join(" / ")}.`);
  }

  function openConflictRecords(conflict: Conflict) {
    const targetId = conflict.allocationIds[0];
    setQuery(conflict.regs[0] ?? "");
    viewAllocation(targetId);
  }

  const transferSource = rows.find((row) => row.id === transferForm.sourceId && row.status !== "vacated") ?? null;
  const transferExcludedKey = transferSource ? bedKey(transferSource.room, transferSource.bed) : undefined;

  const newHostelOptions = selectableHostels();
  const newFloorOptions = selectableFloorsForHostel(newForm.hostel);
  const newRoomOptions = selectableRoomsForFloor(newForm.hostel, newForm.floor);
  const newBedOptions = selectableBedsForSelection(newForm.hostel, newForm.floor, newForm.room);

  const transferHostelOptions = selectableHostels(transferExcludedKey);
  const transferFloorOptions = selectableFloorsForHostel(transferForm.hostel, transferExcludedKey);
  const transferRoomOptions = selectableRoomsForFloor(transferForm.hostel, transferForm.floor, transferExcludedKey);
  const transferBedOptions = selectableBedsForSelection(transferForm.hostel, transferForm.floor, transferForm.room, transferExcludedKey);

  const activeShortcutLabel =
    workflow === "new" ? "New Allocation" : workflow === "transfer" ? "Transfer Resident" : workflow === "checkout" ? "Checkout Resident" : workflow === "edit" ? "Edit Allocation" : "Quick Actions";

  return (
    <section className="allotment-shell space-y-6 p-6 sm:p-7 xl:p-8">
      <header className="allotment-card allotment-hero p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--allotment-text-primary)] sm:text-[2.1rem]">Room Allotment</h1>
              <p className="text-sm leading-7 text-[var(--allotment-text-secondary)] sm:text-[15px]">
                Manage resident allocations, transfers, checkout, conflicts, and allocation history.
              </p>
            </div>

            <label className="allotment-search max-w-3xl">
              <Search className="h-4.5 w-4.5 text-[var(--allotment-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by resident, registration ID, room, or bed"
                className="w-full bg-transparent text-sm text-[var(--allotment-text-primary)] outline-none placeholder:text-[var(--allotment-text-muted)]"
              />
              {query ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--allotment-text-muted)] transition hover:bg-white/5 hover:text-[var(--allotment-text-primary)]"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>
          </div>

          <div className="flex flex-wrap items-start gap-3 xl:max-w-[420px] xl:justify-end">
            <button type="button" className="allotment-button-secondary sm:flex-1 xl:flex-none" onClick={openExportModal}>
              <Download className="h-4 w-4" />
              Export Excel
            </button>
            <button type="button" className="allotment-button-primary sm:flex-1 xl:flex-none" onClick={openNewAllocation}>
              <Plus className="h-4 w-4" />
              New Allocation
            </button>
            <button type="button" className="allotment-button-secondary sm:flex-1 xl:flex-none" onClick={() => openTransferWorkflow()}>
              <ArrowRightLeft className="h-4 w-4" />
              Transfer Resident
            </button>
            <button type="button" className="allotment-button-danger sm:flex-1 xl:flex-none" onClick={() => openCheckoutWorkflow()}>
              <DoorOpen className="h-4 w-4" />
              Checkout Resident
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Beds", value: beds.length, note: "Tracked hostel inventory" },
            { label: "Occupied Beds", value: occupiedBeds, note: "Currently assigned stays" },
            { label: "Reserved Beds", value: reservedBeds, note: "Held for upcoming residents" },
            { label: "Available Beds", value: availableBeds, note: "Ready for allocation" },
          ].map((card) => (
            <article key={card.label} className="allotment-stat-card">
              <p className="text-sm font-medium text-[var(--allotment-text-secondary)]">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--allotment-text-primary)]">{card.value}</p>
              <p className="mt-2 text-sm text-[var(--allotment-text-muted)]">{card.note}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="allotment-card p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--allotment-text-primary)]">Allocation Filters</h2>
            <p className="mt-1 text-sm text-[var(--allotment-text-secondary)]">Filter allocations by hostel, floor, room, or current status.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Hostel</span>
              <select value={hostel} onChange={(event) => setHostel(event.target.value)} className="allotment-control">
                <option value="all">All hostels</option>
                {hostels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Floor</span>
              <select value={floor} onChange={(event) => setFloor(event.target.value)} className="allotment-control">
                <option value="all">All floors</option>
                {floors.map((option) => (
                  <option key={option} value={option}>
                    Floor {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Room</span>
              <select value={room} onChange={(event) => setRoom(event.target.value)} className="allotment-control">
                <option value="all">All rooms</option>
                {rooms.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="allotment-control">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="reserved">Reserved</option>
                <option value="vacated">Completed</option>
              </select>
            </label>

            <div className="flex items-end justify-start xl:justify-end">
              <button type="button" className="allotment-button-secondary w-full sm:w-auto" onClick={clearFilters}>
                <FilterX className="h-4 w-4" />
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.72fr)_minmax(340px,0.88fr)]">
        <section className="allotment-card self-start p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--allotment-text-primary)]">Active Allocations</h2>
              <p className="mt-1 text-sm text-[var(--allotment-text-secondary)]">
                Showing {filteredRows.length} of {rows.length} allocation records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SectionBadge label={`${conflicts.length} conflict alerts`} tone={conflicts.length > 0 ? "danger" : "success"} />
              <SectionBadge label={`${availableBeds} beds available`} tone="neutral" />
            </div>
          </div>

          <div className="allotment-table-wrap mt-5 hidden xl:block">
            <table className="allotment-table">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[24%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Allocation</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const meta = statusMeta(row.status, conflictAllocationIds.has(row.id));

                  return (
                    <tr
                      key={row.id}
                      className="allotment-table-row"
                      data-clickable="true"
                      data-selected={selectedAllocationId === row.id}
                      data-conflict={conflictAllocationIds.has(row.id)}
                      onClick={() => viewAllocation(row.id)}
                      onKeyDown={(event) => handleAllocationKeyDown(event, row.id)}
                      tabIndex={0}
                      aria-selected={selectedAllocationId === row.id}
                    >
                      <td>
                        <div className="space-y-1">
                          <p className="font-semibold text-[var(--allotment-text-primary)]">{row.resident}</p>
                          <p className="text-xs text-[var(--allotment-text-muted)]">{row.reg}</p>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <p className="font-semibold text-[var(--allotment-text-primary)]">{row.room}</p>
                          <p className="text-xs text-[var(--allotment-text-muted)]">
                            Bed {row.bed} - {row.hostel}, Floor {row.floor}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1.5">
                          <SectionBadge label={meta.label} tone={meta.tone} />
                          <p className="text-xs text-[var(--allotment-text-muted)]">{meta.detail}</p>
                        </div>
                      </td>
                      <td className="text-[var(--allotment-text-primary)]">{formatDate(row.start)}</td>
                      <td className="text-[var(--allotment-text-primary)]">{formatDate(row.end)}</td>
                      <td className="align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="allotment-inline-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              viewAllocation(row.id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            className="allotment-inline-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditWorkflow(row.id);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          {row.status !== "vacated" ? (
                            <button
                              type="button"
                              className="allotment-inline-action"
                              onClick={(event) => {
                                event.stopPropagation();
                                openTransferWorkflow(row.id);
                              }}
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              Transfer
                            </button>
                          ) : null}
                          {row.status === "active" ? (
                            <button
                              type="button"
                              className="allotment-inline-action"
                              data-tone="danger"
                              onClick={(event) => {
                                event.stopPropagation();
                                openCheckoutWorkflow(row.id);
                              }}
                            >
                              <DoorOpen className="h-3.5 w-3.5" />
                              Checkout
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 xl:hidden">
            {filteredRows.map((row) => {
              const meta = statusMeta(row.status, conflictAllocationIds.has(row.id));

              return (
                <article
                  key={row.id}
                  className="allotment-card allotment-selectable-card p-4"
                  data-selected={selectedAllocationId === row.id}
                  data-conflict={conflictAllocationIds.has(row.id)}
                  onClick={() => viewAllocation(row.id)}
                  onKeyDown={(event) => handleAllocationKeyDown(event, row.id)}
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--allotment-text-primary)]">{row.resident}</p>
                      <p className="mt-1 text-sm text-[var(--allotment-text-secondary)]">{row.reg}</p>
                    </div>
                    <SectionBadge label={meta.label} tone={meta.tone} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Room / Bed</p>
                      <p className="mt-1 font-semibold text-[var(--allotment-text-primary)]">
                        {row.room} Bed {row.bed}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Hostel / Floor</p>
                      <p className="mt-1 font-medium text-[var(--allotment-text-primary)]">
                        {row.hostel} - Floor {row.floor}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Start Date</p>
                      <p className="mt-1 text-sm text-[var(--allotment-text-primary)]">{formatDate(row.start)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">End Date</p>
                      <p className="mt-1 text-sm text-[var(--allotment-text-primary)]">{formatDate(row.end)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="allotment-inline-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        viewAllocation(row.id);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Allocation
                    </button>
                    <button
                      type="button"
                      className="allotment-inline-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditWorkflow(row.id);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    {row.status !== "vacated" ? (
                      <button
                        type="button"
                        className="allotment-inline-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTransferWorkflow(row.id);
                        }}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transfer
                      </button>
                    ) : null}
                    {row.status === "active" ? (
                      <button
                        type="button"
                        className="allotment-inline-action"
                        data-tone="danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCheckoutWorkflow(row.id);
                        }}
                      >
                        <DoorOpen className="h-3.5 w-3.5" />
                        Checkout
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5 self-start">
          <section className="allotment-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--allotment-text-primary)]">Quick Actions</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--allotment-text-secondary)]">
                  Start a new allocation, process moves, complete checkout, or review the selected resident record.
                </p>
              </div>
              <SectionBadge label={activeShortcutLabel} tone={workflow ? "success" : "neutral"} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
              <button type="button" className="allotment-shortcut" onClick={openNewAllocation}>
                <Plus className="h-4 w-4 text-[var(--allotment-accent-primary)]" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-[var(--allotment-text-primary)]">Start New Allocation</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--allotment-text-muted)]">Assign a bed to a new or returning resident.</p>
                </div>
              </button>
              <button type="button" className="allotment-shortcut" onClick={() => openTransferWorkflow()}>
                <ArrowRightLeft className="h-4 w-4 text-[var(--allotment-accent-primary)]" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-[var(--allotment-text-primary)]">Transfer Resident</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--allotment-text-muted)]">Move a resident to a new room or bed without losing history.</p>
                </div>
              </button>
              <button type="button" className="allotment-shortcut" onClick={() => openCheckoutWorkflow()}>
                <DoorOpen className="h-4 w-4 text-[var(--allotment-danger)]" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-[var(--allotment-text-primary)]">Process Checkout</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--allotment-text-muted)]">Close an active stay and release or hold the bed.</p>
                </div>
              </button>
              <button type="button" className="allotment-shortcut" onClick={() => (conflicts[0] ? resolveConflict(conflicts[0]) : scrollToSection("allocation-conflicts"))}>
                <TriangleAlert className="h-4 w-4 text-[var(--allotment-warning)]" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-[var(--allotment-text-primary)]">{conflicts[0] ? "Resolve Conflict" : "Review Conflict Alerts"}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--allotment-text-muted)]">
                    {conflicts[0] ? "Open the most urgent conflict and take corrective action." : "Jump to the conflict section and confirm the queue is clear."}
                  </p>
                </div>
              </button>
            </div>

            {notice ? <div className="mt-4 rounded-[16px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div> : null}
            {error ? <div className="mt-4 rounded-[16px] border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

            {selectedAllocation ? (
              <article className="mt-4 rounded-[18px] border border-[var(--allotment-border-subtle)] bg-[var(--allotment-bg-surface-elevated)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--allotment-text-secondary)]">Selected Allocation</p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--allotment-text-primary)]">{selectedAllocation.resident}</h3>
                    <p className="mt-1 text-sm text-[var(--allotment-text-secondary)]">{selectedAllocation.reg}</p>
                  </div>
                  <SectionBadge label={statusMeta(selectedAllocation.status, conflictAllocationIds.has(selectedAllocation.id)).label} tone={statusMeta(selectedAllocation.status, conflictAllocationIds.has(selectedAllocation.id)).tone} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Allocation</p>
                    <p className="mt-1 font-medium text-[var(--allotment-text-primary)]">
                      {selectedAllocation.room} Bed {selectedAllocation.bed}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Date Window</p>
                    <p className="mt-1 font-medium text-[var(--allotment-text-primary)]">
                      {formatDate(selectedAllocation.start)} - {formatDate(selectedAllocation.end)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="allotment-inline-action" onClick={() => openEditWorkflow(selectedAllocation.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {selectedAllocation.status !== "vacated" ? (
                    <button type="button" className="allotment-inline-action" onClick={() => openTransferWorkflow(selectedAllocation.id)}>
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Transfer
                    </button>
                  ) : null}
                  {selectedAllocation.status === "active" ? (
                    <button type="button" className="allotment-inline-action" data-tone="danger" onClick={() => openCheckoutWorkflow(selectedAllocation.id)}>
                      <DoorOpen className="h-3.5 w-3.5" />
                      Checkout
                    </button>
                  ) : null}
                </div>
              </article>
            ) : null}

            {workflow === "new" ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-base font-semibold text-[var(--allotment-text-primary)]">Create New Allocation</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={newForm.resident}
                    onChange={(event) => setNewForm((current) => ({ ...current, resident: event.target.value }))}
                    placeholder="Resident name"
                    className="allotment-control"
                  />
                  <input
                    value={newForm.reg}
                    onChange={(event) => setNewForm((current) => ({ ...current, reg: event.target.value }))}
                    placeholder="Registration ID"
                    className="allotment-control"
                  />
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Hostel</span>
                    <select value={newForm.hostel} onChange={(event) => syncNewFormSelection({ hostel: event.target.value })} className="allotment-control">
                      {newHostelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Floor</span>
                    <select value={newForm.floor} onChange={(event) => syncNewFormSelection({ floor: event.target.value })} className="allotment-control">
                      {newFloorOptions.map((option) => (
                        <option key={option} value={option}>
                          Floor {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Room</span>
                    <select value={newForm.room} onChange={(event) => syncNewFormSelection({ room: event.target.value })} className="allotment-control">
                      {newRoomOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Bed</span>
                    <select value={newForm.bed} onChange={(event) => syncNewFormSelection({ bed: event.target.value })} className="allotment-control">
                      {newBedOptions.map((option) => (
                        <option key={option.bed} value={option.bed}>
                          Bed {option.bed}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input type="date" value={newForm.start} onChange={(event) => setNewForm((current) => ({ ...current, start: event.target.value }))} className="allotment-control" />
                  <input type="date" value={newForm.end} onChange={(event) => setNewForm((current) => ({ ...current, end: event.target.value }))} className="allotment-control" />
                  <select value={newForm.status} onChange={(event) => setNewForm((current) => ({ ...current, status: event.target.value as AllocationStatus }))} className="allotment-control sm:col-span-2">
                    <option value="active">Active allocation</option>
                    <option value="reserved">Reserved allocation</option>
                  </select>
                </div>
                <p className="text-xs leading-5 text-[var(--allotment-text-muted)]">
                  Selected location: {newForm.hostel}, Floor {newForm.floor}, Room {newForm.room}, Bed {newForm.bed}
                </p>
                <button type="button" className="allotment-button-primary w-full" onClick={createAllocation}>
                  <BedSingle className="h-4 w-4" />
                  Confirm Allocation
                </button>
              </div>
            ) : null}

            {workflow === "transfer" ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-base font-semibold text-[var(--allotment-text-primary)]">Transfer Resident</h3>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Source Allocation</span>
                  <select value={transferForm.sourceId} onChange={(event) => syncTransferFormSelection({}, Number(event.target.value))} className="allotment-control">
                    <option value={0}>Select source allocation</option>
                    {rows
                      .filter((row) => row.status !== "vacated")
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.resident} ({row.reg}) - {row.room} Bed {row.bed}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Destination Hostel</span>
                    <select
                      value={transferForm.hostel}
                      onChange={(event) => syncTransferFormSelection({ hostel: event.target.value })}
                      className="allotment-control"
                      disabled={!transferForm.sourceId}
                    >
                      {transferHostelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Destination Floor</span>
                    <select
                      value={transferForm.floor}
                      onChange={(event) => syncTransferFormSelection({ floor: event.target.value })}
                      className="allotment-control"
                      disabled={!transferForm.sourceId}
                    >
                      {transferFloorOptions.map((option) => (
                        <option key={option} value={option}>
                          Floor {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Destination Room</span>
                    <select
                      value={transferForm.room}
                      onChange={(event) => syncTransferFormSelection({ room: event.target.value })}
                      className="allotment-control"
                      disabled={!transferForm.sourceId}
                    >
                      {transferRoomOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--allotment-text-muted)]">Destination Bed</span>
                    <select
                      value={transferForm.bed}
                      onChange={(event) => syncTransferFormSelection({ bed: event.target.value })}
                      className="allotment-control"
                      disabled={!transferForm.sourceId}
                    >
                      {transferBedOptions.map((option) => (
                        <option key={option.bed} value={option.bed}>
                          Bed {option.bed}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-xs leading-5 text-[var(--allotment-text-muted)]">
                  Destination: {transferForm.hostel}, Floor {transferForm.floor}, Room {transferForm.room}, Bed {transferForm.bed}
                </p>
                <input
                  type="date"
                  value={transferForm.date}
                  onChange={(event) => setTransferForm((current) => ({ ...current, date: event.target.value }))}
                  className="allotment-control"
                  disabled={!transferForm.sourceId}
                />
                <button type="button" className="allotment-button-primary w-full" onClick={transferResident}>
                  <ArrowRightLeft className="h-4 w-4" />
                  Confirm Transfer
                </button>
              </div>
            ) : null}

            {workflow === "checkout" ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-base font-semibold text-[var(--allotment-text-primary)]">Process Checkout</h3>
                <select value={checkoutForm.sourceId} onChange={(event) => setCheckoutForm((current) => ({ ...current, sourceId: Number(event.target.value) }))} className="allotment-control">
                  <option value={0}>Select active allocation</option>
                  {rows
                    .filter((row) => row.status === "active")
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.resident} ({row.reg}) - {row.room} Bed {row.bed}
                      </option>
                    ))}
                </select>
                <input type="date" value={checkoutForm.date} onChange={(event) => setCheckoutForm((current) => ({ ...current, date: event.target.value }))} className="allotment-control" />
                <label className="inline-flex items-center gap-3 rounded-[16px] border border-[var(--allotment-border-subtle)] bg-white/3 px-4 py-3 text-sm text-[var(--allotment-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={checkoutForm.maintenance}
                    onChange={(event) => setCheckoutForm((current) => ({ ...current, maintenance: event.target.checked }))}
                    className="h-4 w-4 accent-[var(--allotment-accent-primary)]"
                  />
                  Mark bed unavailable for follow-up maintenance
                </label>
                <button type="button" className="allotment-button-danger w-full" onClick={checkoutResident}>
                  <DoorOpen className="h-4 w-4" />
                  Complete Checkout
                </button>
              </div>
            ) : null}

            {workflow === "edit" ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-base font-semibold text-[var(--allotment-text-primary)]">Edit Allocation</h3>
                <select value={editForm.sourceId} onChange={(event) => openEditWorkflow(Number(event.target.value))} className="allotment-control">
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.resident} ({row.reg}) - {row.room} Bed {row.bed}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" value={editForm.start} onChange={(event) => setEditForm((current) => ({ ...current, start: event.target.value }))} className="allotment-control" />
                  <input type="date" value={editForm.end} onChange={(event) => setEditForm((current) => ({ ...current, end: event.target.value }))} className="allotment-control" />
                </div>
                <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as AllocationStatus }))} className="allotment-control">
                  <option value="active">Active</option>
                  <option value="reserved">Reserved</option>
                  <option value="vacated">Completed</option>
                </select>
                <button type="button" className="allotment-button-secondary w-full" onClick={updateAllocation}>
                  <Pencil className="h-4 w-4" />
                  Save Allocation Changes
                </button>
              </div>
            ) : null}
          </section>

          <section className="allotment-card p-5" id="allocation-conflicts">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--allotment-text-primary)]">Allocation Conflicts</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--allotment-text-secondary)]">
                  Review overlapping records quickly and move to the affected allocation without searching manually.
                </p>
              </div>
              <SectionBadge label={`${conflicts.length} open`} tone={conflicts.length > 0 ? "danger" : "success"} />
            </div>

            <div className="mt-4 space-y-3">
              {conflicts.length === 0 ? (
                <div className="rounded-[18px] border border-emerald-400/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-200">
                  No active allocation conflicts detected.
                </div>
              ) : (
                conflicts.map((conflict) => (
                  <article key={conflict.id} className="allotment-alert-item">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <SectionBadge label={conflict.type} tone="danger" />
                          <p className="font-semibold text-[var(--allotment-text-primary)]">
                            {conflict.room} Bed {conflict.bed}
                          </p>
                        </div>
                        <p className="text-sm leading-6 text-[var(--allotment-text-secondary)]">{conflict.summary}</p>
                        <p className="text-xs leading-5 text-[var(--allotment-text-muted)]">
                          Affected records: {conflict.residents.join(", ")} ({conflict.regs.join(" / ")})
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="allotment-inline-action" onClick={() => openConflictRecords(conflict)}>
                          <Eye className="h-3.5 w-3.5" />
                          Open Records
                        </button>
                        <button type="button" className="allotment-inline-action" data-tone="danger" onClick={() => resolveConflict(conflict)}>
                          <ChevronRight className="h-3.5 w-3.5" />
                          Resolve Now
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <ExportColumnModal
        columns={allocationExportColumnOptions}
        confirmLabel="Export Allotments Excel"
        description="Choose the allocation fields to include. The workbook will also include an overview sheet and a conflict summary sheet for operations review."
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={confirmAllocationExport}
        onReset={resetAllocationExportColumns}
        onSelectAll={selectAllAllocationExportColumns}
        onToggleColumn={toggleAllocationExportColumn}
        rowCount={filteredRows.length}
        rowLabel="allocation records"
        selectedColumnIds={selectedAllocationExportColumnIds}
        title="Export Allocation Workbook"
      />
    </section>
  );
}
