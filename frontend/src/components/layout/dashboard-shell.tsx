"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Bell,
  LoaderCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState, useTransition } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { logout } from "@/lib/api";
import { navIcons } from "@/lib/app-icons";
import { useSession } from "@/hooks/use-session";

type DashboardShellProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: navIcons.dashboard },
  { href: "/members", label: "Members", icon: navIcons.members },
  { href: "/rooms", label: "Rooms", icon: navIcons.rooms },
  { href: "/allotments", label: "Allotments", icon: navIcons.allotments },
  { href: "/billing", label: "Billing", icon: navIcons.billing },
  { href: "/notifications", label: "Notifications", icon: navIcons.notifications },
  { href: "/reports", label: "Reports", icon: navIcons.reports },
  { href: "/settings", label: "Settings", icon: navIcons.settings },
];

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string, fallback: string) {
  const source = name.trim() || fallback.trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "HS";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpenPath, setMobileMenuOpenPath] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data, isLoading, isError } = useSession();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  const currentNavItem = useMemo(
    () => NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? NAV_ITEMS[0],
    [pathname],
  );
  const mobileMenuOpen = mobileMenuOpenPath === pathname;

  function openMobileMenu() {
    setMobileMenuOpenPath(pathname);
  }

  function closeMobileMenu() {
    setMobileMenuOpenPath(null);
  }

  async function onLogout() {
    await logout();
    await queryClient.clear();
    startTransition(() => {
      router.replace("/login");
    });
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-transparent">
        <div className="panel panel-soft inline-flex items-center gap-3 px-5 py-4 text-sm text-[var(--color-text-soft)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading workspace...
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const displayName = data.user.first_name?.trim() || data.user.username;
  const roleLabel = formatRole(data.user.role);
  const initials = getInitials(data.user.first_name || data.user.username, data.user.username);

  return (
    <div
      className={clsx(
        "relative min-h-screen overflow-hidden text-[var(--color-text)] lg:grid",
        sidebarCollapsed ? "lg:grid-cols-[88px_minmax(0,1fr)]" : "lg:grid-cols-[272px_minmax(0,1fr)]",
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="dashboard-glow absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[rgba(31,165,158,0.10)] blur-3xl" />
        <div className="dashboard-glow absolute right-[-10rem] top-24 h-96 w-96 rounded-full bg-[rgba(37,93,244,0.10)] blur-3xl" />
        <div className="dashboard-grid absolute inset-0 opacity-70" />
      </div>

      <div
        className={clsx(
          "fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileMenu}
      />

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[84vw] flex-col border-r bg-[var(--color-surface-alt)]/92 backdrop-blur-2xl transition-transform duration-200 lg:static lg:min-h-screen lg:max-w-none lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[88px]" : "lg:w-[272px]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex h-full flex-col">
          <div className="border-b p-3.5 sm:p-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="panel panel-soft panel-elevated relative overflow-hidden p-3.5">
              <div className="absolute inset-0 opacity-90" style={{ background: "var(--dashboard-hero-overlay)" }} />

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className={clsx("min-w-0", sidebarCollapsed && "lg:hidden")}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
                      Hostel Sync
                    </p>
                    <h1 className="mt-2 text-base font-semibold text-[var(--color-text-strong)]">Operations Hub</h1>
                    <p className="mt-1 text-[13px] leading-5 text-[var(--color-text-soft)]">
                      Residents, rooms, collections, and alerts in one refined workspace.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="hidden h-8 w-8 items-center justify-center rounded-[0.85rem] border bg-white/5 text-[var(--color-text-soft)] transition hover:text-[var(--color-text-strong)] lg:inline-flex"
                      style={{ borderColor: "var(--color-border)" }}
                      onClick={() => setSidebarCollapsed((value) => !value)}
                      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                      {sidebarCollapsed ? <PanelLeftOpen className="h-2.5 w-2.5" /> : <PanelLeftClose className="h-2.5 w-2.5" />}
                    </button>

                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[0.85rem] border bg-white/5 text-[var(--color-text-soft)] transition hover:text-[var(--color-text-strong)] lg:hidden"
                      style={{ borderColor: "var(--color-border)" }}
                      onClick={closeMobileMenu}
                      aria-label="Close navigation menu"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>

                <div className={clsx("mt-4 flex items-center gap-2.5", sidebarCollapsed && "lg:mt-2 lg:justify-center")}>
                  <div
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] border bg-white/10 text-[11px] font-semibold text-white shadow-[0_16px_28px_rgba(4,10,23,0.24)]"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    {initials}
                  </div>

                  <div className={clsx("min-w-0", sidebarCollapsed && "lg:hidden")}>
                    <p className="truncate text-[15px] font-semibold text-[var(--color-text-strong)]">{data.user.username}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="dashboard-chip !px-2 !py-1 text-[9px] uppercase tracking-[0.2em]">{roleLabel}</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                        <ShieldCheck className="h-3 w-3" />
                        Active session
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={clsx("px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--color-text-muted)]", sidebarCollapsed && "lg:px-0 lg:text-center")}>
            {sidebarCollapsed ? "Nav" : "Workspace"}
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={clsx(
                    "group flex items-center rounded-[24px] border px-3 py-3 transition",
                    sidebarCollapsed ? "justify-center" : "gap-3",
                    active
                      ? "text-white shadow-[0_22px_44px_rgba(20,64,172,0.28)]"
                      : "border-transparent text-[var(--color-text-soft)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-text-strong)]",
                  )}
                  style={
                    active
                      ? {
                          background: "var(--nav-active-bg)",
                          borderColor: "rgba(255,255,255,0.08)",
                        }
                      : undefined
                  }
                  onClick={closeMobileMenu}
                >
                  <span
                    className={clsx(
                       "inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[0.8rem] border transition",
                      active
                        ? "border-white/10 bg-white/10 text-white"
                        : "border-transparent bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] group-hover:border-[var(--color-border)] group-hover:bg-[rgba(255,255,255,0.06)] group-hover:text-[var(--color-text-strong)]",
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                  </span>

                  <div className={clsx("min-w-0", sidebarCollapsed && "lg:hidden")}>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className={clsx("mt-0.5 text-xs", active ? "text-white/70" : "text-[var(--color-text-muted)]")}>
                      {item.label === "Dashboard" ? "Overview and live operations" : `Manage ${item.label.toLowerCase()}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t px-3 pb-4 pt-3" style={{ borderColor: "var(--color-border)" }}>
            <div className={clsx("panel panel-soft p-3", sidebarCollapsed && "lg:px-2.5")}>
              <div className={clsx(sidebarCollapsed && "lg:hidden")}>
                <p className="text-sm font-semibold text-[var(--color-text-strong)]">Secure workspace</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                  Stay focused while Hostel Sync keeps operations, finance, and resident activity aligned.
                </p>
              </div>

              <button
                type="button"
                onClick={onLogout}
                disabled={isPending}
                title={sidebarCollapsed ? "Sign out" : undefined}
                className={clsx(
                  "mt-3 inline-flex rounded-2xl border bg-[var(--color-surface-strong)] text-sm font-medium text-[var(--color-text-soft)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-text-strong)] disabled:cursor-not-allowed disabled:opacity-60",
                  sidebarCollapsed ? "w-full justify-center px-2 py-3" : "w-full items-center justify-center gap-2 px-4 py-3",
                )}
                style={{ borderColor: "var(--color-border-strong)" }}
              >
                {isPending ? <LoaderCircle className="h-2.5 w-2.5 animate-spin" /> : <LogOut className="h-2.5 w-2.5" />}
                <span className={clsx(sidebarCollapsed && "lg:hidden")}>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 md:px-5 lg:px-5 lg:pt-4">
          <div className="mx-auto w-full max-w-7xl">
            <div className="panel panel-soft flex items-center justify-between gap-3 px-4 py-2 md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={openMobileMenu}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] border bg-white/5 text-[var(--color-text-soft)] transition hover:text-[var(--color-text-strong)] lg:hidden"
                  style={{ borderColor: "var(--color-border)" }}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-2.5 w-2.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((value) => !value)}
                  className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[0.85rem] border bg-white/5 text-[var(--color-text-soft)] transition hover:text-[var(--color-text-strong)] lg:inline-flex"
                  style={{ borderColor: "var(--color-border)" }}
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="h-2.5 w-2.5" /> : <PanelLeftClose className="h-2.5 w-2.5" />}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--color-text-muted)]">
                      {currentNavItem.label}
                    </p>
                    <span className="dashboard-chip hidden sm:inline-flex">
                      <span className="status-dot bg-[var(--status-success)] text-[var(--status-success)]" />
                      Live workspace
                    </span>
                  </div>
                  <p className="truncate text-lg font-semibold text-[var(--color-text-strong)] md:text-[1.2rem]">
                    Welcome back, {displayName}
                  </p>
                  <p className="hidden truncate text-sm text-[var(--color-text-soft)] lg:block">
                    Monitor occupancy, collections, and resident activity from one modern control center.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="hidden h-9 max-w-[16rem] items-center gap-2 rounded-[0.95rem] border bg-white/5 px-3 text-[12px] transition hover:border-[var(--color-border-strong)] md:inline-flex xl:max-w-[18rem]"
                  style={{ borderColor: "var(--color-border)" }}
                  aria-label="Search workspace"
                  title="Search workspace"
                >
                  <Search className="h-2.5 w-2.5 text-[var(--color-text-muted)]" />
                  <span className="truncate text-[var(--color-text-soft)]">Search residents, rooms, invoices</span>
                </button>

                <ThemeToggle compact className="h-8 w-8 rounded-[0.85rem] bg-white/5 shadow-none" />

                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[0.85rem] border bg-white/5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text-strong)]"
                  style={{ borderColor: "var(--color-border)" }}
                  aria-label="Notifications"
                >
                  <Bell className="h-2.5 w-2.5" />
                </button>

                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-[0.95rem] border bg-white/5 px-2 py-1.5 text-left transition hover:border-[var(--color-border-strong)] sm:inline-flex"
                  style={{ borderColor: "var(--color-border)" }}
                  aria-label="Profile"
                  title="Profile"
                >
                  <span className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[0.8rem] border bg-white/10 text-[12px] font-semibold text-[var(--color-text-strong)]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    {initials}
                  </span>
                  <span className="hidden xl:block">
                    <span className="block text-[14px] font-semibold text-[var(--color-text-strong)]">{data.user.username}</span>
                    <span className="block text-[11px] text-[var(--color-text-muted)]">{roleLabel}</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[0.85rem] border bg-white/5 text-[var(--color-text-muted)] transition hover:text-[var(--color-text-strong)] sm:hidden"
                  style={{ borderColor: "var(--color-border)" }}
                  aria-label="Profile"
                  title="Profile"
                >
                  <UserRound className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 px-3 pb-5 pt-3 sm:px-4 md:px-5 lg:px-5 lg:pb-7">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
