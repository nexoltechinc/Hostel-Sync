"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  LoaderCircle,
  LogOut,
  Menu,
  SlidersHorizontal,
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
  { href: "/reports", label: "Reports", icon: navIcons.reports },
  { href: "/settings", label: "Settings", icon: navIcons.settings },
];

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
          "fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ backgroundColor: "var(--color-backdrop-soft)" }}
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
          <div className="border-b px-3 pb-3 pt-3 sm:px-4" style={{ borderColor: "var(--color-border)" }}>
            <div className={clsx("flex items-center", sidebarCollapsed ? "lg:justify-center" : "justify-end")}>
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-[1rem] border bg-[var(--color-overlay-soft)] text-[var(--color-text-soft)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-overlay-muted)] hover:text-[var(--color-text-strong)] lg:inline-flex"
                style={{ borderColor: "var(--color-border)" }}
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[1rem] border bg-[var(--color-overlay-soft)] text-[var(--color-text-soft)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-overlay-muted)] hover:text-[var(--color-text-strong)] lg:hidden"
                style={{ borderColor: "var(--color-border)" }}
                onClick={closeMobileMenu}
                aria-label="Close navigation menu"
                title="Close navigation menu"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className={clsx("px-5 pb-2 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--color-text-muted)]", sidebarCollapsed && "lg:px-0 lg:text-center")}>
            {sidebarCollapsed ? "Nav" : "Workspace"}
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
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
                      : "border-transparent bg-[var(--color-overlay-soft)] text-[var(--color-text-muted)] group-hover:border-[var(--color-border)] group-hover:bg-[var(--color-overlay-muted)] group-hover:text-[var(--color-text-strong)]",
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

            <div
              className={clsx(
                "mt-2 border-t pt-2",
                sidebarCollapsed ? "lg:flex lg:justify-center" : "",
              )}
              style={{ borderColor: "var(--color-border)" }}
            >
              <button
                type="button"
                onClick={onLogout}
                disabled={isPending}
                title={sidebarCollapsed ? "Sign out" : undefined}
                className={clsx(
                  "inline-flex rounded-[24px] border bg-[var(--color-surface-strong)] text-sm font-medium text-[var(--color-text-soft)] transition hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-text-strong)] disabled:cursor-not-allowed disabled:opacity-60",
                  sidebarCollapsed ? "w-full justify-center px-3 py-3" : "w-full items-center gap-3 px-3 py-3",
                )}
                style={{ borderColor: "var(--color-border)" }}
              >
                <span className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[0.8rem] bg-[var(--color-overlay-soft)] text-[var(--color-text-muted)]">
                  {isPending ? <LoaderCircle className="h-2.5 w-2.5 animate-spin" /> : <LogOut className="h-2.5 w-2.5" />}
                </span>

                <div className={clsx("min-w-0 text-left", sidebarCollapsed && "lg:hidden")}>
                  <p className="text-sm font-semibold text-[var(--color-text-strong)]">Sign out</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Exit current workspace</p>
                </div>
              </button>
            </div>
          </nav>

          <div className="border-t px-3 pb-3 pt-2.5" style={{ borderColor: "var(--color-border)" }}>
            <div className={clsx("panel panel-soft p-2.5", sidebarCollapsed && "lg:px-2.5")}>
              <div className={clsx("flex items-center justify-between gap-3", sidebarCollapsed && "lg:justify-center")}>
                <ThemeToggle compact className="h-9 w-9 shrink-0 rounded-[0.95rem] bg-[var(--color-overlay-soft)] shadow-none" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-screen min-w-0 flex-col">
        <main className="relative flex-1 px-3 py-3 sm:px-4 md:px-5 lg:px-5 lg:py-5">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
              <button
                type="button"
                onClick={openMobileMenu}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem] border bg-[var(--color-overlay-soft)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-overlay-muted)] hover:text-[var(--color-text-strong)]"
                style={{ borderColor: "var(--color-border)" }}
                aria-label="Open navigation menu"
              >
                <Menu className="h-2.5 w-2.5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-end gap-2">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--color-text-muted)]">
                    {currentNavItem.label}
                  </p>
                  <span className="dashboard-chip">
                    <span className="status-dot bg-[var(--status-success)] text-[var(--status-success)]" />
                    Live workspace
                  </span>
                </div>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
