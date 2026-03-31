"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarCheck2,
  CircleAlert,
  CircleDollarSign,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "@/components/ui/section-heading";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { summaryIcons } from "@/lib/app-icons";
import type { DashboardSummary } from "@/lib/types";

type Accent = {
  solid: string;
  soft: string;
  surface: string;
};

type MetricCard = {
  title: string;
  value: string;
  subtitle: string;
  meta: string;
  progress: number;
  icon: LucideIcon;
  href: string;
  accent: Accent;
};

type PulseItem = {
  title: string;
  value: string;
  helper: string;
  progress: number;
  accent: Accent;
};

const CARD_ACCENTS: Accent[] = [
  { solid: "#245df4", soft: "#1b82f0", surface: "rgba(36, 93, 244, 0.18)" },
  { solid: "#1b82f0", soft: "#38bdf8", surface: "rgba(27, 130, 240, 0.16)" },
  { solid: "#1fa59e", soft: "#2dd4bf", surface: "rgba(31, 165, 158, 0.16)" },
  { solid: "#22c55e", soft: "#4ade80", surface: "rgba(34, 197, 94, 0.16)" },
  { solid: "#f29a38", soft: "#f6c25d", surface: "rgba(242, 154, 56, 0.16)" },
  { solid: "#0ea5a4", soft: "#2dd4bf", surface: "rgba(14, 165, 164, 0.16)" },
  { solid: "#fb7185", soft: "#fda4af", surface: "rgba(251, 113, 133, 0.16)" },
];

function clampPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

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

function formatStatusLabel(status: string) {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (
    ["ok", "ready", "healthy", "active", "enabled", "connected", "complete", "configured", "available"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return { label: "Healthy", color: "var(--status-success)" };
  }

  if (["error", "failed", "offline", "disabled", "blocked", "missing"].some((token) => normalized.includes(token))) {
    return { label: "Needs attention", color: "var(--status-danger)" };
  }

  return { label: "In progress", color: "var(--status-warning)" };
}

function buildMetricCards(data: DashboardSummary): MetricCard[] {
  const membersActiveRate =
    data.summary.total_members > 0 ? (data.summary.active_members / data.summary.total_members) * 100 : 0;
  const roomsActiveRate = data.summary.total_rooms > 0 ? (data.summary.active_rooms / data.summary.total_rooms) * 100 : 0;
  const capacityRate = data.summary.total_beds > 0 ? (data.summary.available_beds / data.summary.total_beds) * 100 : 0;
  const cashCoverage =
    data.financial.pending_dues === null
      ? 0
      : data.financial.pending_dues === 0
        ? 100
        : data.financial.monthly_collection === null
          ? 24
          : (data.financial.monthly_collection / (data.financial.monthly_collection + data.financial.pending_dues)) * 100;
  const collectionMomentum =
    data.financial.monthly_collection === null
      ? 0
      : data.financial.monthly_collection === 0
        ? 12
        : data.financial.pending_dues === null
          ? 46
          : (data.financial.monthly_collection / Math.max(data.financial.pending_dues + data.financial.monthly_collection, 1)) * 100;
  const alertsHealth =
    data.notifications.unread === null ? 0 : data.notifications.unread === 0 ? 100 : Math.max(12, 100 - data.notifications.unread * 14);

  return [
    {
      title: "Total Members",
      value: formatCount(data.summary.total_members),
      subtitle: `${data.summary.active_members.toLocaleString("en-US")} active residents`,
      meta: `${clampPercent(membersActiveRate)}% active`,
      progress: clampPercent(membersActiveRate),
      icon: summaryIcons.totalMembers,
      href: "/members",
      accent: CARD_ACCENTS[0],
    },
    {
      title: "Total Rooms",
      value: formatCount(data.summary.total_rooms),
      subtitle: `${data.summary.active_rooms.toLocaleString("en-US")} active rooms`,
      meta: `${clampPercent(roomsActiveRate)}% operational`,
      progress: clampPercent(roomsActiveRate),
      icon: summaryIcons.totalRooms,
      href: "/rooms",
      accent: CARD_ACCENTS[1],
    },
    {
      title: "Occupied Beds",
      value: formatCount(data.summary.occupied_beds),
      subtitle: `${data.summary.occupancy_rate}% occupancy across current inventory`,
      meta: `${data.summary.total_beds.toLocaleString("en-US")} total beds`,
      progress: clampPercent(data.summary.occupancy_rate),
      icon: summaryIcons.occupiedBeds,
      href: "/allotments",
      accent: CARD_ACCENTS[2],
    },
    {
      title: "Available Capacity",
      value: formatCount(data.summary.available_beds),
      subtitle: `${data.summary.total_beds.toLocaleString("en-US")} total beds in circulation`,
      meta: `${clampPercent(capacityRate)}% free`,
      progress: clampPercent(capacityRate),
      icon: summaryIcons.availableBeds,
      href: "/rooms",
      accent: CARD_ACCENTS[3],
    },
    {
      title: "Pending Dues",
      value: formatCurrency(data.financial.pending_dues),
      subtitle:
        data.financial.pending_dues === null ? "Financial summary unavailable." : "Outstanding balances still waiting for collection.",
      meta:
        data.financial.pending_dues === null
          ? "Billing feed unavailable"
          : data.financial.pending_dues === 0
            ? "No dues pending"
            : "Cash recovery in focus",
      progress: clampPercent(cashCoverage),
      icon: summaryIcons.pendingDues,
      href: "/billing",
      accent: CARD_ACCENTS[4],
    },
    {
      title: "Monthly Collection",
      value: formatCurrency(data.financial.monthly_collection),
      subtitle:
        data.financial.monthly_collection === null ? "Financial summary unavailable." : "Collections received in the current billing cycle.",
      meta:
        data.financial.monthly_collection === null
          ? "Billing feed unavailable"
          : data.financial.monthly_collection === 0
            ? "No payments booked yet"
            : "Collection momentum building",
      progress: clampPercent(collectionMomentum),
      icon: summaryIcons.monthlyCollection,
      href: "/billing",
      accent: CARD_ACCENTS[5],
    },
    {
      title: "Unread Alerts",
      value: formatCount(data.notifications.unread),
      subtitle: data.notifications.unread === null ? "Notification summary unavailable." : "Signals waiting for operator review.",
      meta: data.notifications.unread === 0 ? "Inbox clear" : "Review recommended",
      progress: clampPercent(alertsHealth),
      icon: summaryIcons.alerts,
      href: "/notifications",
      accent: CARD_ACCENTS[6],
    },
  ];
}

function buildPulseItems(data: DashboardSummary): PulseItem[] {
  const residentActivity =
    data.summary.total_members > 0 ? (data.summary.active_members / data.summary.total_members) * 100 : 0;
  const attendanceCoverage =
    data.attendance.present_today === null || data.summary.active_members === 0
      ? 0
      : (data.attendance.present_today / Math.max(data.summary.active_members, 1)) * 100;
  const collectionPace =
    data.financial.monthly_collection === null
      ? 0
      : data.financial.pending_dues === null
        ? 48
        : data.financial.pending_dues === 0
          ? 100
          : (data.financial.monthly_collection / Math.max(data.financial.pending_dues + data.financial.monthly_collection, 1)) * 100;

  return [
    {
      title: "Occupancy rhythm",
      value: `${clampPercent(data.summary.occupancy_rate)}%`,
      helper: `${data.summary.occupied_beds.toLocaleString("en-US")} of ${data.summary.total_beds.toLocaleString("en-US")} beds currently assigned`,
      progress: clampPercent(data.summary.occupancy_rate),
      accent: CARD_ACCENTS[2],
    },
    {
      title: "Resident activity",
      value: `${clampPercent(residentActivity)}%`,
      helper: `${data.summary.active_members.toLocaleString("en-US")} active members in the current roster`,
      progress: clampPercent(residentActivity),
      accent: CARD_ACCENTS[0],
    },
    {
      title: "Attendance capture",
      value: data.attendance.present_today === null ? "N/A" : formatCount(data.attendance.present_today),
      helper:
        data.attendance.present_today === null
          ? "Attendance feed has not reported yet."
          : `${formatCount(data.attendance.absent_today)} absences recorded today`,
      progress: clampPercent(attendanceCoverage),
      accent: CARD_ACCENTS[3],
    },
    {
      title: "Collection pace",
      value: data.financial.monthly_collection === null ? "N/A" : formatCurrency(data.financial.monthly_collection),
      helper:
        data.financial.pending_dues === null
          ? "Pending dues summary unavailable."
          : `${formatCurrency(data.financial.pending_dues)} still outstanding`,
      progress: clampPercent(collectionPace),
      accent: CARD_ACCENTS[4],
    },
  ];
}

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <section className="space-y-5 pb-2">
        <div className="dashboard-fade-up grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(300px,0.9fr)]">
          <div className="panel panel-soft panel-elevated relative overflow-hidden px-5 py-5 md:px-6 md:py-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(230px,0.72fr)] xl:items-end">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="dashboard-skeleton h-7 w-40 rounded-full" />
                  <div className="dashboard-skeleton h-7 w-36 rounded-full" />
                </div>
                <div className="dashboard-skeleton h-4 w-32 rounded-full" />
                <div className="dashboard-skeleton h-14 w-full max-w-[30rem] rounded-[1.25rem]" />
                <div className="dashboard-skeleton h-5 w-full max-w-[28rem] rounded-full" />
                <div className="dashboard-skeleton h-5 w-full max-w-[24rem] rounded-full" />
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <div className="dashboard-skeleton h-10 w-40 rounded-[1rem]" />
                  <div className="dashboard-skeleton h-10 w-44 rounded-[1rem]" />
                  <div className="dashboard-skeleton h-10 w-36 rounded-[1rem]" />
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="dashboard-stat-card rounded-[22px] px-3.5 py-3.5">
                    <div className="dashboard-skeleton h-3.5 w-24 rounded-full" />
                    <div className="dashboard-skeleton mt-3 h-8 w-20 rounded-[0.85rem]" />
                    <div className="dashboard-skeleton mt-2 h-4 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel panel-soft panel-elevated p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="dashboard-skeleton h-3 w-28 rounded-full" />
                <div className="dashboard-skeleton h-10 w-52 rounded-[1rem]" />
              </div>
              <div className="dashboard-skeleton h-7 w-24 rounded-full" />
            </div>

            <div className="mt-5 space-y-2.5">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="dashboard-surface-card rounded-[22px] border p-3.5" style={{ borderColor: "var(--color-border)" }}>
                  <div className="dashboard-skeleton h-4 w-28 rounded-full" />
                  <div className="dashboard-skeleton mt-3 h-8 w-20 rounded-[0.85rem]" />
                  <div className="dashboard-skeleton mt-2 h-4 w-full rounded-full" />
                  <div className="dashboard-progress-track mt-4 h-1.5">
                    <div className="dashboard-skeleton h-full w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-fade-up grid gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" style={{ animationDelay: "100ms" }}>
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="panel panel-soft p-4">
              <div className="dashboard-skeleton h-4 w-28 rounded-full" />
              <div className="dashboard-skeleton mt-3 h-9 w-24 rounded-[1rem]" />
              <div className="dashboard-skeleton mt-3 h-4 w-full rounded-full" />
              <div className="dashboard-skeleton mt-2 h-4 w-2/3 rounded-full" />
              <div className="dashboard-progress-track mt-4 h-1.5">
                <div className="dashboard-skeleton h-full w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-fade-up panel panel-soft inline-flex items-center gap-3 px-5 py-4 text-sm text-[var(--color-text-soft)]" style={{ animationDelay: "180ms" }}>
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
        <SectionHeading icon={summaryIcons.recentActivity} eyebrow="Operations" title="Dashboard unavailable" />

        <div className="panel panel-soft flex items-center gap-3 p-4 text-sm text-[var(--color-text-soft)]">
          <CircleAlert className="h-4 w-4 text-[var(--status-danger)]" />
          {detail}
        </div>
      </section>
    );
  }

  const metricCards = buildMetricCards(data);
  const pulseItems = buildPulseItems(data);
  const latestEvent = data.recent_activities[0];
  const readinessItems = Object.entries(data.integrations).map(([name, status]) => ({
    name: formatStatusLabel(name),
    status: formatStatusLabel(status),
    tone: getStatusTone(status),
  }));
  const attentionItems = [
    {
      title: "Pending dues",
      value: formatCurrency(data.financial.pending_dues),
      detail:
        data.financial.pending_dues === null
          ? "Billing signal unavailable for this workspace."
          : data.financial.pending_dues === 0
            ? "No open receivables need follow-up right now."
            : "Prioritize follow-up on residents with outstanding invoices.",
      href: "/billing",
      icon: CircleDollarSign,
      accent: CARD_ACCENTS[4],
    },
    {
      title: "Unread alerts",
      value: formatCount(data.notifications.unread),
      detail:
        data.notifications.unread === null
          ? "Notifications feed unavailable for this workspace."
          : data.notifications.unread === 0
            ? "Inbox is clear and no fresh alerts are waiting."
            : "Review announcement, billing, or room alerts still in queue.",
      href: "/notifications",
      icon: BellRing,
      accent: CARD_ACCENTS[6],
    },
    {
      title: "Attendance exceptions",
      value: formatCount(data.attendance.absent_today),
      detail:
        data.attendance.absent_today === null
          ? "Attendance tracking has not reported yet."
          : data.attendance.absent_today === 0
            ? "No absences have been reported today."
            : "Residents are currently marked absent and may need review.",
      href: "/reports",
      icon: CalendarCheck2,
      accent: CARD_ACCENTS[3],
    },
  ];

  return (
    <section className="space-y-5 pb-2">
      <div className="dashboard-fade-up grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(300px,0.9fr)]">
        <div className="panel panel-soft panel-elevated relative overflow-hidden px-5 py-5 md:px-6 md:py-6">
          <div className="absolute inset-0 opacity-95" style={{ background: "var(--dashboard-hero-overlay)" }} />
          <div className="absolute right-[-3rem] top-[-1.5rem] h-32 w-32 rounded-full bg-[rgba(255,255,255,0.06)] blur-3xl" />

          <div className="relative xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(230px,0.72fr)] xl:items-end xl:gap-5">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="dashboard-chip">
                  <Sparkles className="h-3 w-3" />
                  Modern hostel operations
                </span>
                <span className="dashboard-chip">
                  <span className="status-dot bg-[var(--status-success)] text-[var(--status-success)]" />
                  {data.scope.is_global ? "Global portfolio view" : "Single-hostel workspace"}
                </span>
                {latestEvent ? <span className="dashboard-chip">Latest event {formatTimestamp(latestEvent.timestamp)}</span> : null}
              </div>

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-brand-300)]">
                Realtime orchestration
              </p>
              <h1 className="mt-5 max-w-[34rem] text-[2rem] font-semibold leading-tight tracking-[-0.05em] text-[var(--color-text-strong)] sm:text-[2.65rem]">
                Operations Dashboard
              </h1>
              <p className="mt-3 max-w-[32rem] text-sm leading-6 text-[var(--color-text-soft)] sm:text-[15px]">
                Run residents, rooms, collections, attendance, and notifications from a cleaner command center built for modern hostel management.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href="/members"
                  className="dashboard-cta dashboard-cta-primary group"
                >
                  Manage residents
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/rooms"
                  className="dashboard-cta dashboard-cta-secondary group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Review room inventory
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/billing"
                  className="dashboard-cta dashboard-cta-secondary group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Open billing console
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-3 xl:mt-0 xl:grid-cols-1">
              <div className="dashboard-stat-card rounded-[22px] px-3.5 py-3.5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Active Residents</p>
                <p className="mt-2.5 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">
                  {formatCount(data.summary.active_members)}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-text-soft)]">Current residents in active standing.</p>
              </div>

              <div className="dashboard-stat-card rounded-[22px] px-3.5 py-3.5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Occupancy</p>
                <p className="mt-2.5 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">
                  {clampPercent(data.summary.occupancy_rate)}%
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-text-soft)]">A live reading of bed utilization.</p>
              </div>

              <div className="dashboard-stat-card rounded-[22px] px-3.5 py-3.5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Pending Dues</p>
                <p className="mt-2.5 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">
                  {formatCurrency(data.financial.pending_dues)}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-text-soft)]">Financial exposure currently waiting for follow-up.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel panel-soft panel-elevated relative overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Operational Pulse</p>
              <h2 className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Today at a glance</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Live signals across occupancy, attendance, activity, and revenue.</p>
            </div>
            <span className="dashboard-chip">
              <ShieldCheck className="h-[0.7rem] w-[0.7rem]" />
              Live status
            </span>
          </div>

          <div className="mt-5 space-y-2.5">
            {pulseItems.map((item, index) => (
              <article
                key={item.title}
                className="dashboard-surface-card dashboard-fade-up rounded-[22px] border p-3.5"
                style={{ animationDelay: `${index * 90 + 60}ms`, borderColor: "var(--color-border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-soft)]">{item.title}</p>
                    <p className="mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">{item.value}</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">{item.helper}</p>
                  </div>
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.accent.solid }} />
                </div>
                <div className="dashboard-progress-track mt-3 h-1.5">
                  <div
                    className="dashboard-progress-fill"
                    style={{ width: `${item.progress}%`, background: `linear-gradient(90deg, ${item.accent.solid}, ${item.accent.soft})` }}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-[22px] border bg-[rgba(255,255,255,0.03)] p-3.5" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-strong)]">Module readiness</p>
                <p className="text-xs text-[var(--color-text-muted)]">Operational feeds and module health</p>
              </div>
              <BadgeCheck className="h-3 w-3 text-[var(--status-success)]" />
            </div>

            <div className="mt-3.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {readinessItems.map((item, index) => (
                <div
                  key={item.name}
                  className="dashboard-surface-card dashboard-fade-up flex items-center justify-between rounded-[18px] border px-3 py-2.5 text-sm"
                  style={{ animationDelay: `${index * 70 + 220}ms`, borderColor: "var(--color-border)" }}
                >
                  <div>
                    <p className="text-[var(--color-text-soft)]">{item.name}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{item.status}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: item.tone.color, borderColor: `${item.tone.color}33` }}>
                    <span className="status-dot" style={{ backgroundColor: item.tone.color, color: item.tone.color }} />
                    {item.tone.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-fade-up grid gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              href={card.href}
              className="panel panel-soft panel-interactive dashboard-fade-up group relative overflow-hidden p-4"
              style={{ animationDelay: `${index * 70 + 140}ms` }}
            >
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 86% 18%, ${card.accent.surface} 0%, transparent 48%)` }}
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-soft)]">{card.title}</p>
                    <p className="mt-2.5 text-[1.75rem] font-semibold tracking-[-0.05em] text-[var(--color-text-strong)]">{card.value}</p>
                  </div>
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] border"
                    style={{
                      borderColor: card.accent.surface,
                      background: `linear-gradient(180deg, ${card.accent.surface}, rgba(255,255,255,0.02))`,
                      color: card.accent.solid,
                    }}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                </div>

                <p className="mt-2 text-sm leading-5 text-[var(--color-text-muted)]">{card.subtitle}</p>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                  <span className="text-[var(--color-text-muted)]">{card.meta}</span>
                  <span className="inline-flex items-center gap-1 font-semibold" style={{ color: card.accent.solid }}>
                    Open
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>

                <div className="dashboard-progress-track mt-2.5 h-1.5">
                  <div
                    className="dashboard-progress-fill"
                    style={{ width: `${card.progress}%`, background: `linear-gradient(90deg, ${card.accent.solid}, ${card.accent.soft})` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="dashboard-fade-up grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
        <section className="panel panel-soft p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Recent Activity</p>
              <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Operational timeline</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">New resident, room, and finance events animate into the timeline as the workspace updates.</p>
            </div>
            <span className="dashboard-chip">
              <BadgeCheck className="h-[0.7rem] w-[0.7rem]" />
              {data.recent_activities.length.toLocaleString("en-US")} events
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {data.recent_activities.length === 0 ? (
              <div
                className="dashboard-surface-card rounded-[22px] border px-3.5 py-3.5 text-sm text-[var(--color-text-soft)]"
                style={{ borderColor: "var(--color-border)" }}
              >
                No recent activity is available yet.
              </div>
            ) : (
              data.recent_activities.slice(0, 5).map((activity, index) => (
                <article
                  key={`${activity.type}-${activity.reference_id}`}
                  className="dashboard-surface-card dashboard-fade-up rounded-[22px] border px-3.5 py-3.5"
                  style={{ animationDelay: `${index * 80 + 220}ms`, borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] border"
                      style={{
                        borderColor: CARD_ACCENTS[index % CARD_ACCENTS.length].surface,
                        background: `linear-gradient(180deg, ${CARD_ACCENTS[index % CARD_ACCENTS.length].surface}, rgba(255,255,255,0.02))`,
                        color: CARD_ACCENTS[index % CARD_ACCENTS.length].solid,
                      }}
                    >
                      <summaryIcons.recentActivity className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--color-text-strong)]">{activity.title}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[var(--color-text-soft)]">{activity.description}</p>
                      <div
                        className="mt-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        {formatStatusLabel(activity.type)}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="panel panel-soft p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.9rem] border border-[rgba(251,113,133,0.18)] bg-[rgba(251,113,133,0.12)] text-[var(--status-danger)]">
                <CircleAlert className="h-3 w-3" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Attention Board</p>
                <h2 className="mt-1 text-[1.3rem] font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Priority checks</h2>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {attentionItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="dashboard-surface-card dashboard-fade-up group block rounded-[22px] border p-3.5"
                    style={{ animationDelay: `${index * 90 + 280}ms`, borderColor: "var(--color-border)" }}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] border"
                        style={{
                          borderColor: item.accent.surface,
                          background: `linear-gradient(180deg, ${item.accent.surface}, rgba(255,255,255,0.02))`,
                          color: item.accent.solid,
                        }}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--color-text-strong)]">{item.title}</p>
                          <span className="text-sm font-semibold text-[var(--color-text-strong)]">{item.value}</span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-[var(--color-text-soft)]">{item.detail}</p>
                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: item.accent.solid }}>
                          Review now
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="panel panel-soft p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.9rem] border border-[rgba(36,93,244,0.18)] bg-[rgba(36,93,244,0.12)] text-[#245df4]">
                <Sparkles className="h-3 w-3" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Quick Routes</p>
                <h2 className="mt-1 text-[1.3rem] font-semibold tracking-[-0.03em] text-[var(--color-text-strong)]">Move faster</h2>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5">
              <Link
                href="/members"
                className="dashboard-surface-card dashboard-fade-up flex items-center justify-between rounded-[20px] border px-4 py-2.5 text-sm font-semibold text-[var(--color-text-strong)]"
                style={{ animationDelay: "320ms", borderColor: "var(--color-border)" }}
              >
                <span>
                  <span className="block">Member directory</span>
                  <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Residents and profiles</span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" />
              </Link>
              <Link
                href="/rooms"
                className="dashboard-surface-card dashboard-fade-up flex items-center justify-between rounded-[20px] border px-4 py-2.5 text-sm font-semibold text-[var(--color-text-strong)]"
                style={{ animationDelay: "390ms", borderColor: "var(--color-border)" }}
              >
                <span>
                  <span className="block">Room inventory</span>
                  <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Capacity and availability</span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" />
              </Link>
              <Link
                href="/billing"
                className="dashboard-surface-card dashboard-fade-up flex items-center justify-between rounded-[20px] border px-4 py-2.5 text-sm font-semibold text-[var(--color-text-strong)]"
                style={{ animationDelay: "460ms", borderColor: "var(--color-border)" }}
              >
                <span>
                  <span className="block">Billing center</span>
                  <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Dues and collections</span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
