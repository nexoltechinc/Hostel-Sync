"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  BedSingle,
  Bell,
  BookOpenCheck,
  Building2,
  CreditCard,
  Home,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useTransition } from "react";

import { logout } from "@/lib/api";
import { useSession } from "@/hooks/use-session";

type DashboardShellProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/rooms", label: "Rooms", icon: Building2 },
  { href: "/allotments", label: "Allotments", icon: BedSingle },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/attendance", label: "Attendance", icon: BookOpenCheck },
  { href: "/reports", label: "Reports", icon: Home },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const { data, isLoading, isError } = useSession();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  async function onLogout() {
    await logout();
    await queryClient.clear();
    startTransition(() => {
      router.replace("/login");
    });
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
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
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-slate-200 bg-white/90 backdrop-blur lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">One Hostel Manager</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{data.user.username}</p>
            <p className="text-xs text-slate-500">{data.user.role}</p>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <button
              type="button"
              onClick={onLogout}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Hostel Operations</p>
              <p className="text-sm font-medium text-slate-800">Welcome back, {data.user.first_name || data.user.username}</p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-700"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
