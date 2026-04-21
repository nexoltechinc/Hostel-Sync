"use client";

import {
  BedSingle,
  Building2,
  CalendarRange,
  CreditCard,
  Download,
  Filter,
  LoaderCircle,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useDeferredValue, useState } from "react";

import { ExportColumnModal } from "@/components/ui/export-column-modal";
import { IconBadge } from "@/components/ui/icon-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  useFeeCollectionReport,
  useOccupancyReport,
  usePendingDuesReport,
} from "@/hooks/use-reports";
import { moduleIcons } from "@/lib/app-icons";
import {
  exportWorkbookToExcel,
  type ExportColumnDefinition,
  type ExportSheetDefinition,
} from "@/lib/export";
import type {
  FeeCollectionReportRow,
  OccupancyReportRow,
  PendingDuesReportRow,
  RoomType,
} from "@/lib/types";

function dateInputValue(offsetDays = 0) {
  const current = new Date();
  current.setDate(current.getDate() + offsetDays);
  current.setMinutes(current.getMinutes() - current.getTimezoneOffset());
  return current.toISOString().slice(0, 10);
}

function monthStartInputValue() {
  const current = new Date();
  current.setDate(1);
  current.setMinutes(current.getMinutes() - current.getTimezoneOffset());
  return current.toISOString().slice(0, 10);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function roomTypeLabel(value: RoomType | "all") {
  if (value === "standard") {
    return "Standard";
  }
  if (value === "deluxe") {
    return "Deluxe";
  }
  if (value === "private") {
    return "Private";
  }
  return "All room types";
}

function formatMonthLabel(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function sentenceCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function invoiceStatusClass(status: string) {
  if (status === "open") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "partially_paid") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function reportSectionState(isLoading: boolean, isError: boolean, error: unknown) {
  if (isLoading) {
    return (
      <div className="grid min-h-[180px] place-items-center text-sm text-slate-500">
        <div className="inline-flex items-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading report data...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {error instanceof Error ? error.message : "Failed to load report."}
      </div>
    );
  }

  return null;
}

const OCCUPANCY_EXPORT_COLUMNS: ExportColumnDefinition<OccupancyReportRow>[] = [
  {
    id: "occupancy_hostel_code",
    label: "Occupancy · Hostel",
    description: "Occupancy sheet: hostel code for each room.",
    width: 16,
    getValue: (row) => row.hostel_code,
  },
  {
    id: "occupancy_room_code",
    label: "Occupancy · Room",
    description: "Occupancy sheet: room code under the hostel inventory.",
    width: 16,
    getValue: (row) => row.room_code,
  },
  {
    id: "occupancy_floor",
    label: "Occupancy · Floor",
    description: "Occupancy sheet: floor or zone label.",
    width: 14,
    getValue: (row) => row.floor || "No floor label",
  },
  {
    id: "occupancy_room_type",
    label: "Occupancy · Room Type",
    description: "Occupancy sheet: configured room type.",
    width: 16,
    getValue: (row) => roomTypeLabel(row.room_type),
  },
  {
    id: "occupancy_status",
    label: "Occupancy · Status",
    description: "Occupancy sheet: active or inactive room status.",
    width: 14,
    getValue: (row) => (row.is_active ? "Active" : "Inactive"),
  },
  {
    id: "occupancy_capacity",
    label: "Occupancy · Capacity",
    description: "Occupancy sheet: room capacity value.",
    kind: "number",
    width: 14,
    getValue: (row) => row.capacity,
  },
  {
    id: "occupancy_total_beds",
    label: "Occupancy · Total Beds",
    description: "Occupancy sheet: total configured beds.",
    kind: "number",
    width: 14,
    getValue: (row) => row.total_beds,
  },
  {
    id: "occupancy_active_beds",
    label: "Occupancy · Active Beds",
    description: "Occupancy sheet: active operational beds.",
    kind: "number",
    width: 14,
    getValue: (row) => row.active_beds,
  },
  {
    id: "occupancy_occupied_beds",
    label: "Occupancy · Occupied Beds",
    description: "Occupancy sheet: currently occupied beds.",
    kind: "number",
    width: 15,
    getValue: (row) => row.occupied_beds,
  },
  {
    id: "occupancy_available_beds",
    label: "Occupancy · Available Beds",
    description: "Occupancy sheet: beds still available for use.",
    kind: "number",
    width: 15,
    getValue: (row) => row.available_beds,
  },
  {
    id: "occupancy_rate",
    label: "Occupancy · Occupancy Rate",
    description: "Occupancy sheet: occupancy percentage per room.",
    kind: "percent",
    width: 18,
    getValue: (row) => row.occupancy_rate,
  },
  {
    id: "occupancy_monthly_rent",
    label: "Occupancy · Monthly Rent",
    description: "Occupancy sheet: configured monthly rent for the room.",
    defaultSelected: false,
    kind: "currency",
    width: 18,
    getValue: (row) => row.monthly_rent,
  },
];

const COLLECTION_EXPORT_COLUMNS: ExportColumnDefinition<FeeCollectionReportRow>[] = [
  {
    id: "collection_payment_date",
    label: "Collections · Payment Date",
    description: "Collections sheet: posting date for the payment.",
    kind: "date",
    width: 16,
    getValue: (row) => row.payment_date,
  },
  {
    id: "collection_hostel",
    label: "Collections · Hostel",
    description: "Collections sheet: hostel code linked to the payment.",
    width: 16,
    getValue: (row) => row.hostel_code,
  },
  {
    id: "collection_member_code",
    label: "Collections · Member Code",
    description: "Collections sheet: resident code for cross-reference.",
    width: 18,
    getValue: (row) => row.member_code,
  },
  {
    id: "collection_member_name",
    label: "Collections · Member",
    description: "Collections sheet: resident name.",
    width: 24,
    getValue: (row) => row.member_name,
  },
  {
    id: "collection_method",
    label: "Collections · Method",
    description: "Collections sheet: payment method label.",
    width: 16,
    getValue: (row) => row.method_label,
  },
  {
    id: "collection_receipt_number",
    label: "Collections · Receipt Number",
    description: "Collections sheet: receipt or payment number.",
    width: 22,
    getValue: (row) => row.receipt_number,
  },
  {
    id: "collection_reference",
    label: "Collections · Reference",
    description: "Collections sheet: external or bank reference number.",
    defaultSelected: false,
    width: 22,
    getValue: (row) => row.reference_no,
  },
  {
    id: "collection_amount",
    label: "Collections · Amount",
    description: "Collections sheet: total payment amount.",
    kind: "currency",
    width: 16,
    getValue: (row) => row.amount,
  },
  {
    id: "collection_applied_amount",
    label: "Collections · Applied",
    description: "Collections sheet: amount applied to open invoices.",
    kind: "currency",
    width: 16,
    getValue: (row) => row.applied_amount,
  },
  {
    id: "collection_credit_added",
    label: "Collections · Credit Added",
    description: "Collections sheet: credit balance created from the payment.",
    kind: "currency",
    width: 18,
    getValue: (row) => row.credit_added,
  },
];

const DUES_EXPORT_COLUMNS: ExportColumnDefinition<PendingDuesReportRow>[] = [
  {
    id: "dues_hostel",
    label: "Dues · Hostel",
    description: "Pending dues sheet: hostel code for the invoice.",
    width: 16,
    getValue: (row) => row.hostel_code,
  },
  {
    id: "dues_member_code",
    label: "Dues · Member Code",
    description: "Pending dues sheet: resident code for follow-up.",
    width: 18,
    getValue: (row) => row.member_code,
  },
  {
    id: "dues_member_name",
    label: "Dues · Member",
    description: "Pending dues sheet: resident name.",
    width: 24,
    getValue: (row) => row.member_name,
  },
  {
    id: "dues_billing_month",
    label: "Dues · Billing Month",
    description: "Pending dues sheet: billed month for the invoice.",
    width: 18,
    getValue: (row) => formatMonthLabel(row.billing_month),
  },
  {
    id: "dues_issue_date",
    label: "Dues · Issue Date",
    description: "Pending dues sheet: invoice issue date.",
    kind: "date",
    width: 16,
    getValue: (row) => row.issue_date,
  },
  {
    id: "dues_due_date",
    label: "Dues · Due Date",
    description: "Pending dues sheet: invoice due date.",
    kind: "date",
    width: 16,
    getValue: (row) => row.due_date,
  },
  {
    id: "dues_status",
    label: "Dues · Status",
    description: "Pending dues sheet: invoice lifecycle status.",
    width: 16,
    getValue: (row) => sentenceCase(row.status),
  },
  {
    id: "dues_total_amount",
    label: "Dues · Total Amount",
    description: "Pending dues sheet: gross invoice amount.",
    kind: "currency",
    width: 16,
    getValue: (row) => row.total_amount,
  },
  {
    id: "dues_paid_amount",
    label: "Dues · Paid Amount",
    description: "Pending dues sheet: payments already collected.",
    kind: "currency",
    width: 16,
    getValue: (row) => row.paid_amount,
  },
  {
    id: "dues_balance_amount",
    label: "Dues · Balance",
    description: "Pending dues sheet: outstanding invoice balance.",
    kind: "currency",
    width: 16,
    getValue: (row) => row.balance_amount,
  },
  {
    id: "dues_days_overdue",
    label: "Dues · Days Overdue",
    description: "Pending dues sheet: aging in days past due.",
    kind: "number",
    width: 16,
    getValue: (row) => row.days_overdue ?? 0,
  },
  {
    id: "dues_overdue_flag",
    label: "Dues · Overdue",
    description: "Pending dues sheet: indicates overdue invoices.",
    defaultSelected: false,
    kind: "boolean",
    width: 14,
    getValue: (row) => row.is_overdue,
  },
];

const reportExportColumnOptions = [
  ...OCCUPANCY_EXPORT_COLUMNS,
  ...COLLECTION_EXPORT_COLUMNS,
  ...DUES_EXPORT_COLUMNS,
].map(({ id, label, description }) => ({
  id,
  label,
  description,
}));

const defaultReportExportColumnIds = [
  ...OCCUPANCY_EXPORT_COLUMNS,
  ...COLLECTION_EXPORT_COLUMNS,
  ...DUES_EXPORT_COLUMNS,
]
  .filter((column) => column.defaultSelected !== false)
  .map((column) => column.id);

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(monthStartInputValue);
  const [dateTo, setDateTo] = useState(dateInputValue);
  const [roomType, setRoomType] = useState<RoomType | "all">("all");
  const [activeRoomFilter, setActiveRoomFilter] = useState<boolean | "all">("all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedReportExportColumnIds, setSelectedReportExportColumnIds] = useState<string[]>(
    defaultReportExportColumnIds,
  );
  const [exportNotice, setExportNotice] = useState<{ message: string; tone: "danger" | "info" | "success" | "warning" } | null>(null);

  const deferredDateFrom = useDeferredValue(dateFrom);
  const deferredDateTo = useDeferredValue(dateTo);

  const occupancyQuery = useOccupancyReport({
    room_type: roomType,
    is_active: activeRoomFilter,
  });
  const feeCollectionQuery = useFeeCollectionReport({
    date_from: deferredDateFrom,
    date_to: deferredDateTo,
  });
  const pendingDuesQuery = usePendingDuesReport({
    only_overdue: onlyOverdue,
    due_on_or_before: deferredDateTo,
  });
  const occupancyState = reportSectionState(occupancyQuery.isLoading, occupancyQuery.isError, occupancyQuery.error);
  const feeCollectionState = reportSectionState(feeCollectionQuery.isLoading, feeCollectionQuery.isError, feeCollectionQuery.error);
  const pendingDuesState = reportSectionState(pendingDuesQuery.isLoading, pendingDuesQuery.isError, pendingDuesQuery.error);
  const totalReportRows =
    (occupancyQuery.data?.rows.length ?? 0) +
    (feeCollectionQuery.data?.rows.length ?? 0) +
    (pendingDuesQuery.data?.rows.length ?? 0);

  function openExportModal() {
    if (totalReportRows === 0) {
      setExportNotice({
        message: "Load report data first before exporting the workbook.",
        tone: "warning",
      });
      return;
    }

    setIsExportModalOpen(true);
  }

  function toggleReportExportColumn(columnId: string) {
    setSelectedReportExportColumnIds((current) =>
      current.includes(columnId) ? current.filter((item) => item !== columnId) : [...current, columnId],
    );
  }

  function resetReportExportColumns() {
    setSelectedReportExportColumnIds(defaultReportExportColumnIds);
  }

  function selectAllReportExportColumns() {
    setSelectedReportExportColumnIds(reportExportColumnOptions.map((column) => column.id));
  }

  function confirmReportExport() {
    const occupancyColumns = OCCUPANCY_EXPORT_COLUMNS.filter((column) =>
      selectedReportExportColumnIds.includes(column.id),
    );
    const collectionColumns = COLLECTION_EXPORT_COLUMNS.filter((column) =>
      selectedReportExportColumnIds.includes(column.id),
    );
    const duesColumns = DUES_EXPORT_COLUMNS.filter((column) =>
      selectedReportExportColumnIds.includes(column.id),
    );

    // Sheets intentionally use different row shapes under one workbook.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sheets: ExportSheetDefinition<any>[] = [
      {
        filters: [
          { label: "Date From", value: formatDate(dateFrom) },
          { label: "Date To", value: formatDate(dateTo) },
          { label: "Room Type", value: roomTypeLabel(roomType) },
          {
            label: "Room Status",
            value:
              activeRoomFilter === "all"
                ? "All rooms"
                : activeRoomFilter
                  ? "Active only"
                  : "Inactive only",
          },
          { label: "Only Overdue Dues", value: onlyOverdue ? "Yes" : "No" },
        ],
        sheetName: "Overview",
        subtitle: "Cross-functional reporting workbook summarizing occupancy, fee collections, and pending dues.",
        summary: [
          {
            helper: "Current occupancy ratio across the filtered room inventory.",
            kind: "percent",
            label: "Occupancy Rate",
            value: occupancyQuery.data?.summary.occupancy_rate ?? 0,
          },
          {
            helper: "Net collections posted in the selected date window.",
            kind: "currency",
            label: "Total Collected",
            value: feeCollectionQuery.data?.summary.total_collected ?? 0,
          },
          {
            helper: "Outstanding balance across matching open invoices.",
            kind: "currency",
            label: "Total Outstanding",
            value: pendingDuesQuery.data?.summary.total_outstanding ?? 0,
          },
          {
            helper: "Invoices currently overdue and needing follow-up.",
            kind: "number",
            label: "Overdue Invoices",
            value: pendingDuesQuery.data?.summary.overdue_invoices ?? 0,
          },
        ],
        title: "Reports Workbook Overview",
      },
    ];

    if (occupancyQuery.data && occupancyColumns.length > 0) {
      sheets.push({
        columns: occupancyColumns,
        filters: [
          { label: "Room Type", value: roomTypeLabel(roomType) },
          {
            label: "Room Status",
            value:
              activeRoomFilter === "all"
                ? "All rooms"
                : activeRoomFilter
                  ? "Active only"
                  : "Inactive only",
          },
        ],
        rows: occupancyQuery.data.rows,
        sheetName: "Occupancy",
        subtitle: "Room-level occupancy, bed availability, and room utilization details.",
        summary: [
          { kind: "number", label: "Total Rooms", value: occupancyQuery.data.summary.total_rooms },
          { kind: "number", label: "Active Beds", value: occupancyQuery.data.summary.active_beds },
          { kind: "number", label: "Occupied Beds", value: occupancyQuery.data.summary.occupied_beds },
          { kind: "percent", label: "Occupancy Rate", value: occupancyQuery.data.summary.occupancy_rate },
        ],
        title: "Occupancy Report",
      });
    }

    if (feeCollectionQuery.data && collectionColumns.length > 0) {
      sheets.push({
        columns: collectionColumns,
        filters: [
          { label: "Date From", value: formatDate(dateFrom) },
          { label: "Date To", value: formatDate(dateTo) },
        ],
        rows: feeCollectionQuery.data.rows,
        sheetName: "Collections",
        subtitle: "Payment receipts, applied amounts, and method mix for the selected reporting window.",
        summary: [
          { kind: "number", label: "Payment Count", value: feeCollectionQuery.data.summary.payment_count },
          { kind: "currency", label: "Total Collected", value: feeCollectionQuery.data.summary.total_collected },
          { kind: "currency", label: "Total Applied", value: feeCollectionQuery.data.summary.total_applied },
          { kind: "currency", label: "Credits Added", value: feeCollectionQuery.data.summary.total_credit_added },
        ],
        title: "Fee Collection Report",
      });
    }

    if (pendingDuesQuery.data && duesColumns.length > 0) {
      sheets.push({
        columns: duesColumns,
        filters: [
          { label: "Due On Or Before", value: formatDate(dateTo) },
          { label: "Overdue Only", value: onlyOverdue ? "Yes" : "No" },
        ],
        rows: pendingDuesQuery.data.rows,
        sheetName: "Pending Dues",
        subtitle: "Invoice aging, outstanding balances, and overdue recovery targets.",
        summary: [
          { kind: "number", label: "Invoice Count", value: pendingDuesQuery.data.summary.invoice_count },
          { kind: "number", label: "Member Count", value: pendingDuesQuery.data.summary.member_count },
          { kind: "currency", label: "Total Outstanding", value: pendingDuesQuery.data.summary.total_outstanding },
          { kind: "number", label: "Overdue Invoices", value: pendingDuesQuery.data.summary.overdue_invoices },
        ],
        title: "Pending Dues Report",
      });
    }

    const dataSheets = sheets.filter((sheet) => sheet.sheetName !== "Overview" && sheet.columns && sheet.columns.length > 0);

    if (dataSheets.length === 0) {
      setExportNotice({
        message: "Select at least one report column from a loaded report sheet before exporting.",
        tone: "warning",
      });
      return;
    }

    exportWorkbookToExcel({
      fileName: `reports-workbook-${new Date().toISOString().slice(0, 10)}`,
      sheets,
      subject: "Hostel operational reporting export",
      title: "Reports Workbook",
    });

    setExportNotice({
      message: `Reports workbook exported successfully with ${dataSheets.length} report sheet${dataSheets.length === 1 ? "" : "s"}.`,
      tone: "success",
    });
    setIsExportModalOpen(false);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeading
          icon={moduleIcons.reports}
          eyebrow="Module 9"
          title="Reports"
          description="Management-ready visibility across occupancy, collections, dues, and attendance with shared operational filters."
        />

        <button type="button" onClick={openExportModal} className="dashboard-cta dashboard-cta-secondary self-start">
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      {exportNotice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            exportNotice.tone === "success"
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
              : exportNotice.tone === "danger"
                ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                : "border-amber-400/25 bg-amber-500/10 text-amber-200"
          }`}
        >
          {exportNotice.message}
        </div>
      ) : null}

      <section className="panel p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <IconBadge icon={Filter} size="sm" />
          <div>
            <p className="text-sm font-medium text-slate-900">Shared report filters</p>
            <p className="text-xs text-slate-500">Keep occupancy, collections, dues, and attendance analysis aligned from one control set.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          <label className="space-y-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <CalendarRange className="h-3.5 w-3.5" />
              Date From
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
            />
          </label>

          <label className="space-y-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <CalendarRange className="h-3.5 w-3.5" />
              Date To
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
            />
          </label>

          <label className="space-y-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <Building2 className="h-3.5 w-3.5" />
              Room Type
            </span>
            <select
              value={roomType}
              onChange={(event) => setRoomType(event.target.value as RoomType | "all")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
            >
              <option value="all">All room types</option>
              <option value="standard">Standard</option>
              <option value="deluxe">Deluxe</option>
              <option value="private">Private</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <BedSingle className="h-3.5 w-3.5" />
              Room Status
            </span>
            <select
              value={activeRoomFilter === "all" ? "all" : activeRoomFilter ? "true" : "false"}
              onChange={(event) => {
                if (event.target.value === "all") {
                  setActiveRoomFilter("all");
                  return;
                }
                setActiveRoomFilter(event.target.value === "true");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
            >
              <option value="all">All rooms</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </label>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={onlyOverdue}
            onChange={(event) => setOnlyOverdue(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand-600)] focus:ring-[var(--color-brand-400)]"
          />
          Show overdue dues only
        </label>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <a href="#occupancy-report" className="group panel block p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--color-brand-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 transition-colors group-hover:text-[var(--color-brand-600)]">Occupancy</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {occupancyQuery.data ? formatPercent(occupancyQuery.data.summary.occupancy_rate) : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{roomTypeLabel(roomType)}</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-transform group-hover:scale-110 group-hover:bg-[var(--color-brand-50)] group-hover:text-[var(--color-brand-600)]">
              <BedSingle className="h-4 w-4" />
            </span>
          </div>
        </a>

        <a href="#collections-report" className="group panel block p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--color-brand-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 transition-colors group-hover:text-[var(--color-brand-600)]">Collections</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {feeCollectionQuery.data ? formatCurrency(feeCollectionQuery.data.summary.total_collected) : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-500">For selected date range</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-transform group-hover:scale-110 group-hover:bg-[var(--color-brand-50)] group-hover:text-[var(--color-brand-600)]">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
        </a>

        <a href="#pending-dues-report" className="group panel block p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--color-brand-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 transition-colors group-hover:text-[var(--color-brand-600)]">Pending Dues</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {pendingDuesQuery.data ? formatCurrency(pendingDuesQuery.data.summary.total_outstanding) : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {pendingDuesQuery.data ? `${pendingDuesQuery.data.summary.overdue_invoices} overdue invoices` : "Awaiting report data"}
              </p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-transform group-hover:scale-110 group-hover:bg-[var(--color-brand-50)] group-hover:text-[var(--color-brand-600)]">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
        </a>
      </div>

      <section id="occupancy-report" className="panel p-5 scroll-mt-24">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Occupancy Report</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">Room-level capacity, active beds, occupancy, and vacancy visibility.</p>

        <div className="mt-4">{occupancyState}</div>
        {occupancyQuery.data ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Rooms</p>
                <p className="text-lg font-semibold text-slate-900">{occupancyQuery.data.summary.total_rooms}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Active Beds</p>
                <p className="text-lg font-semibold text-slate-900">{occupancyQuery.data.summary.active_beds}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Occupied</p>
                <p className="text-lg font-semibold text-slate-900">{occupancyQuery.data.summary.occupied_beds}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Vacancy Rate</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatPercent(100 - occupancyQuery.data.summary.occupancy_rate)}
                </p>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {occupancyQuery.data.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.room_code}</p>
                      <p className="text-xs text-slate-500">{row.floor || "No floor label"}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${row.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Type</p>
                      <p className="font-medium capitalize text-slate-800">{row.room_type.replace("_", " ")}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Occupancy</p>
                      <p className="font-medium text-slate-800">{formatPercent(row.occupancy_rate)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Beds</p>
                      <p className="font-medium text-slate-800">
                        {row.active_beds}/{row.total_beds}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Available</p>
                      <p className="font-medium text-slate-800">{row.available_beds}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Room</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Beds</th>
                    <th className="px-3 py-2">Occupied</th>
                    <th className="px-3 py-2">Available</th>
                    <th className="px-3 py-2 text-right">Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {occupancyQuery.data.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{row.room_code}</p>
                        <p className="text-xs text-slate-500">{row.floor || "No floor label"}</p>
                      </td>
                      <td className="px-3 py-2 capitalize text-slate-700">{row.room_type.replace("_", " ")}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${row.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.active_beds}/{row.total_beds}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.occupied_beds}</td>
                      <td className="px-3 py-2 text-slate-700">{row.available_beds}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatPercent(row.occupancy_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section id="collections-report" className="panel p-5 scroll-mt-24">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Fee Collection Report</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">Payments received, applied amounts, and collection method mix.</p>

        <div className="mt-4">{feeCollectionState}</div>
        {feeCollectionQuery.data ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Collected</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(feeCollectionQuery.data.summary.total_collected)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Applied</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(feeCollectionQuery.data.summary.total_applied)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Credits Added</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(feeCollectionQuery.data.summary.total_credit_added)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {feeCollectionQuery.data.by_method.map((method) => (
                <span key={method.method} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  {method.label}: {formatCurrency(method.total_collected)}
                </span>
              ))}
            </div>

            <div className="space-y-3 md:hidden">
              {feeCollectionQuery.data.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.member_name}</p>
                      <p className="text-xs text-slate-500">{row.member_code}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {row.method_label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Date</p>
                      <p className="font-medium text-slate-800">{formatDate(row.payment_date)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Amount</p>
                      <p className="font-medium text-slate-800">{formatCurrency(row.amount)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Applied</p>
                      <p className="font-medium text-slate-800">{formatCurrency(row.applied_amount)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Credit</p>
                      <p className="font-medium text-slate-800">{formatCurrency(row.credit_added)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Applied</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {feeCollectionQuery.data.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-slate-700">{formatDate(row.payment_date)}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{row.member_name}</p>
                        <p className="text-xs text-slate-500">{row.member_code}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.method_label}</td>
                      <td className="px-3 py-2 text-right text-slate-900">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.applied_amount)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.credit_added)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section id="pending-dues-report" className="panel p-5 scroll-mt-24">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Pending Dues Report</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">Outstanding balances, invoice risk, and overdue recovery targets.</p>

        <div className="mt-4">{pendingDuesState}</div>
        {pendingDuesQuery.data ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Outstanding</p>
                <p className="text-lg font-semibold text-slate-900">{formatCurrency(pendingDuesQuery.data.summary.total_outstanding)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Open Invoices</p>
                <p className="text-lg font-semibold text-slate-900">{pendingDuesQuery.data.summary.open_invoices}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Overdue</p>
                <p className="text-lg font-semibold text-slate-900">{pendingDuesQuery.data.summary.overdue_invoices}</p>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {pendingDuesQuery.data.rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.member_name}</p>
                      <p className="text-xs text-slate-500">{row.member_code}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${invoiceStatusClass(row.status)}`}>
                      {row.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Billing Month</p>
                      <p className="font-medium text-slate-800">{formatDate(row.billing_month)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Due Date</p>
                      <p className="font-medium text-slate-800">{formatDate(row.due_date)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Balance</p>
                      <p className="font-medium text-slate-800">{formatCurrency(row.balance_amount)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Overdue</p>
                      <p className="font-medium text-slate-800">{row.days_overdue ?? 0} days</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2">Billing Month</th>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                    <th className="px-3 py-2 text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pendingDuesQuery.data.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{row.member_name}</p>
                        <p className="text-xs text-slate-500">{row.member_code}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{formatDate(row.billing_month)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDate(row.due_date)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${invoiceStatusClass(row.status)}`}>
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(row.balance_amount)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.days_overdue ?? 0} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {occupancyQuery.isError || feeCollectionQuery.isError || pendingDuesQuery.isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <TriangleAlert className="h-4 w-4" />
          One or more report sections could not be loaded. The other sections remain available.
        </div>
      ) : null}

      <ExportColumnModal
        columns={reportExportColumnOptions}
        confirmLabel="Export Reports Excel"
        description="Choose which report columns to include. The workbook will keep a professional overview sheet and add data sheets for each loaded report section with selected columns."
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={confirmReportExport}
        onReset={resetReportExportColumns}
        onSelectAll={selectAllReportExportColumns}
        onToggleColumn={toggleReportExportColumn}
        rowCount={totalReportRows}
        rowLabel="report rows"
        selectedColumnIds={selectedReportExportColumnIds}
        title="Export Reports Workbook"
      />
    </section>
  );
}
