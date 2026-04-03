"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
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

type SpotlightStat = {
  label: string;
  value: string;
  detail: string;
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
      <section className="grid min-h-[42vh] place-items-center">
        <div className="panel panel-soft inline-flex items-center gap-3 px-5 py-4 text-sm text-[var(--color-text-soft)]">
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
  const spotlightStats: SpotlightStat[] = [
    {
      label: "Active residents",
      value: formatCount(data.summary.active_members),
      detail: "Residents currently in active standing across the live workspace.",
      accent: CARD_ACCENTS[0],
    },
    {
      label: "Available beds",
      value: formatCount(data.summary.available_beds),
      detail: `${data.summary.total_beds.toLocaleString("en-US")} beds currently in circulation.`,
      accent: CARD_ACCENTS[3],
    },
    {
      label: "Occupancy rate",
      value: `${clampPercent(data.summary.occupancy_rate)}%`,
      detail: `${data.summary.occupied_beds.toLocaleString("en-US")} beds assigned right now.`,
      accent: CARD_ACCENTS[2],
    },
    {
      label: "Billing position",
      value: formatCurrency(data.financial.pending_dues),
      detail:
        data.financial.pending_dues === null
          ? "Billing insight is currently unavailable."
          : data.financial.pending_dues === 0
            ? "No open receivables need attention."
            : "Outstanding balances need follow-up.",
      accent: CARD_ACCENTS[4],
    },
  ];
  return (
    <section className="space-y-4 pb-3 md:space-y-5">
      <div className="dashboard-fade-up grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_344px]">
        <section className="panel panel-soft panel-elevated relative h-full overflow-hidden p-5 md:p-6">
          <div className="absolute inset-0 opacity-95" style={{ background: "var(--dashboard-hero-overlay)" }} />
          <div className="absolute right-[-4rem] top-[-2rem] h-40 w-40 rounded-full bg-[rgba(255,255,255,0.06)] blur-3xl" />
          <div className="absolute left-[-3rem] bottom-[-4rem] h-36 w-36 rounded-full bg-[rgba(31,165,158,0.14)] blur-3xl" />

          <div className="relative z-[1] grid gap-4 xl:h-full xl:grid-cols-[minmax(0,1.14fr)_minmax(290px,0.86fr)]">
            <div className="flex h-full flex-col gap-5">
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

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--color-text-muted)]">
                  Operations Command Center
                </p>
                <h1 className="max-w-[34rem] text-[2rem] font-semibold leading-tight tracking-[-0.05em] text-[var(--color-text-strong)] sm:text-[2.7rem]">
                  Operations Dashboard
                </h1>
                <p className="max-w-[34rem] text-sm leading-6 text-[var(--color-text-soft)] sm:text-[15px]">
                  Stay on top of residents, rooms, collections, attendance, and daily execution from one cleaner, better-aligned control surface.
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-2.5">
                <Link
                  href="/members"
                  className="dashboard-cta dashboard-cta-primary"
                >
                  Manage residents
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/rooms"
                  className="dashboard-cta dashboard-cta-secondary"
                >
                  Review room inventory
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/billing"
                  className="dashboard-cta dashboard-cta-secondary"
                >
                  Open billing console
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="grid auto-rows-fr gap-2.5 sm:grid-cols-2">
              {spotlightStats.map((item) => (
                <article
                  key={item.label}
                  className="dashboard-stat-card h-full rounded-[22px] px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">{item.label}</p>
                      <p className="mt-3 text-[1.75rem] font-semibold tracking-[-0.05em] text-[var(--color-text-strong)]">{item.value}</p>
                    </div>
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.accent.solid }} />
                  </div>
                  <p className="mt-2.5 text-sm leading-5 text-[var(--color-text-soft)]">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="panel panel-soft panel-elevated relative h-full overflow-hidden p-4 md:p-5">
          <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 100% 0%, rgba(36, 93, 244, 0.16), transparent 40%)" }} />
          <div className="relative z-[1]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Operational Pulse</p>
                <h2 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Today at a glance</h2>
                <p className="mt-2 text-sm leading-5 text-[var(--color-text-soft)]">
                  Occupancy, attendance, collections, and daily activity in one quick read.
                </p>
              </div>
              <span className="dashboard-chip">
                <ShieldCheck className="h-[0.7rem] w-[0.7rem]" />
                Live status
              </span>
            </div>

            <div className="mt-4 grid auto-rows-fr gap-2.5 sm:grid-cols-2">
              {pulseItems.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[20px] border bg-[rgba(255,255,255,0.04)] p-3.5"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--color-text-soft)]">{item.title}</p>
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.accent.solid }} />
                  </div>
                  <p className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">{item.value}</p>
                  <p className="mt-1 min-h-[2.25rem] text-xs leading-5 text-[var(--color-text-muted)]">{item.helper}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.progress}%`, background: `linear-gradient(90deg, ${item.accent.solid}, ${item.accent.soft})` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="dashboard-fade-up grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              href={card.href}
              className="panel panel-soft panel-interactive group relative h-full overflow-hidden p-4"
            >
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 86% 18%, ${card.accent.surface} 0%, transparent 48%)` }}
              />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-soft)]">{card.title}</p>
                    <p className="mt-2.5 text-[1.8rem] font-semibold tracking-[-0.05em] text-[var(--color-text-strong)]">{card.value}</p>
                  </div>
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem] border"
                    style={{
                      borderColor: card.accent.surface,
                      background: `linear-gradient(180deg, ${card.accent.surface}, rgba(255,255,255,0.02))`,
                      color: card.accent.solid,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>

                <p className="mt-2 text-sm leading-5 text-[var(--color-text-muted)]">{card.subtitle}</p>

                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[var(--color-text-muted)]">{card.meta}</span>
                    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: card.accent.solid }}>
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${card.progress}%`, background: `linear-gradient(90deg, ${card.accent.solid}, ${card.accent.soft})` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="dashboard-fade-up grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_360px] xl:items-start">
        <section className="panel panel-soft p-4 md:p-5 xl:self-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--color-text-muted)]">Recent Activity</p>
              <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)]">Operational timeline</h2>
            </div>
            <span className="dashboard-chip">
              <BadgeCheck className="h-[0.7rem] w-[0.7rem]" />
              {data.recent_activities.length.toLocaleString("en-US")} events
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {data.recent_activities.length === 0 ? (
              <article
                className="rounded-[22px] border bg-[rgba(255,255,255,0.04)] px-3.5 py-3.5 text-sm text-[var(--color-text-soft)]"
                style={{ borderColor: "var(--color-border)" }}
              >
                No recent activity is available yet.
              </article>
            ) : (
              data.recent_activities.slice(0, 5).map((activity, index) => (
                <article
                  key={`${activity.type}-${activity.reference_id}`}
                  className="rounded-[22px] border bg-[rgba(255,255,255,0.04)] px-3.5 py-3.5 transition hover:border-[var(--color-border-strong)]"
                  style={{ borderColor: "var(--color-border)" }}
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

        <aside className="space-y-4 xl:self-start">
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
              {attentionItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group block rounded-[22px] border bg-[rgba(255,255,255,0.04)] p-3.5 transition hover:border-[var(--color-border-strong)]"
                    style={{ borderColor: "var(--color-border)" }}
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

        </aside>
      </div>
    </section>
  );
}
