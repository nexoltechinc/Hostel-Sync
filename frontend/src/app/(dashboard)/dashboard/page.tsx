"use client";

import {
  BedSingle,
  Bell,
  Building2,
  CalendarCheck2,
  CreditCard,
  LoaderCircle,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";

import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import type { DashboardSummary } from "@/lib/types";

function formatCurrency(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCount(value: number | null) {
  if (value === null) {
    return "N/A";
  }
  return value.toLocaleString("en-US");
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function integrationBadgeClass(status: string) {
  return status === "connected"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function buildMetricCards(data: DashboardSummary) {
  return [
    {
      title: "Total Members",
      value: formatCount(data.summary.total_members),
      subtitle: `${data.summary.active_members.toLocaleString("en-US")} active residents`,
      icon: Users,
    },
    {
      title: "Total Rooms",
      value: formatCount(data.summary.total_rooms),
      subtitle: `${data.summary.active_rooms.toLocaleString("en-US")} active rooms`,
      icon: Building2,
    },
    {
      title: "Occupied Beds",
      value: formatCount(data.summary.occupied_beds),
      subtitle: `${data.summary.occupancy_rate}% occupancy`,
      icon: BedSingle,
    },
    {
      title: "Available Capacity",
      value: formatCount(data.summary.available_beds),
      subtitle: `${data.summary.total_beds.toLocaleString("en-US")} total beds`,
      icon: BedSingle,
    },
    {
      title: "Pending Dues",
      value: formatCurrency(data.financial.pending_dues),
      subtitle:
        data.financial.pending_dues === null ? "Financial summary unavailable." : "Outstanding amount pending collection.",
      icon: CreditCard,
    },
    {
      title: "Monthly Collection",
      value: formatCurrency(data.financial.monthly_collection),
      subtitle:
        data.financial.monthly_collection === null ? "Financial summary unavailable." : "Collections received this month.",
      icon: Wallet,
    },
    {
      title: "Attendance Today",
      value: formatCount(data.attendance.present_today),
      subtitle:
        data.attendance.present_today === null ? "Attendance summary unavailable." : `${formatCount(data.attendance.absent_today)} marked absent`,
      icon: CalendarCheck2,
    },
    {
      title: "Unread Alerts",
      value: formatCount(data.notifications.unread),
      subtitle: data.notifications.unread === null ? "Notification summary unavailable." : "Unread notifications in queue.",
      icon: Bell,
    },
  ];
}

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <section className="grid min-h-[40vh] place-items-center">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading dashboard metrics...
        </div>
      </section>
    );
  }

  if (isError || !data) {
    const detail = error instanceof Error ? error.message : "Unable to load dashboard summary.";

    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module 2</p>
          <h1 className="text-2xl font-semibold text-slate-900">Operations Dashboard</h1>
        </header>

        <div className="panel flex items-center gap-3 p-4 text-sm text-slate-700">
          <TriangleAlert className="h-4 w-4 text-rose-500" />
          {detail}
        </div>
      </section>
    );
  }

  const metricCards = buildMetricCards(data);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module 2</p>
        <h1 className="text-2xl font-semibold text-slate-900">Operations Dashboard</h1>
        <p className="text-sm text-slate-600">
          Live operational overview across members, rooms, allotments, billing, attendance, and notifications.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => (
          <article key={card.title} className="panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <card.icon className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Integration Status</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(data.integrations).map(([moduleName, status]) => (
              <div key={moduleName} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <p className="text-sm font-medium text-slate-700 capitalize">{moduleName}</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${integrationBadgeClass(status)}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {data.recent_activities.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                No recent activity available yet.
              </p>
            ) : (
              data.recent_activities.map((activity) => (
                <article key={`${activity.type}-${activity.reference_id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                  <p className="text-xs text-slate-600">{activity.description}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-500">{formatTimestamp(activity.timestamp)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
