"use client";

import {
  BedSingle,
  Building2,
  CalendarRange,
  CreditCard,
  Filter,
  LoaderCircle,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useDeferredValue, useState } from "react";

import { IconBadge } from "@/components/ui/icon-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  useFeeCollectionReport,
  useOccupancyReport,
  usePendingDuesReport,
} from "@/hooks/use-reports";
import { moduleIcons } from "@/lib/app-icons";
import type { RoomType } from "@/lib/types";

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

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(monthStartInputValue);
  const [dateTo, setDateTo] = useState(dateInputValue);
  const [roomType, setRoomType] = useState<RoomType | "all">("all");
  const [activeRoomFilter, setActiveRoomFilter] = useState<boolean | "all">("all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

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

  return (
    <section className="space-y-6">
      <SectionHeading
        icon={moduleIcons.reports}
        eyebrow="Module 9"
        title="Reports"
        description="Management-ready visibility across occupancy, collections, dues, and attendance with shared operational filters."
      />

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
    </section>
  );
}
