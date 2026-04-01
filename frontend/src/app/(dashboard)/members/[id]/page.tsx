"use client";

import { ArrowLeft, CalendarDays, LoaderCircle, MapPin, Phone, ShieldAlert, UserRound } from "lucide-react";
import Link from "next/link";

import { useMember } from "@/hooks/use-members";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function statusBadge(status: string) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "inactive") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-300 bg-slate-100 text-slate-700";
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const memberId = Number(params.id);
  const memberQuery = useMember(Number.isFinite(memberId) ? memberId : null);

  if (memberQuery.isLoading) {
    return (
      <section className="grid min-h-[40vh] place-items-center">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading member profile...
        </div>
      </section>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <section className="space-y-4">
        <Link href="/members" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {memberQuery.error instanceof Error ? memberQuery.error.message : "Unable to load member details."}
        </div>
      </section>
    );
  }

  const member = memberQuery.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link href="/members" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to members
          </Link>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Member Detail</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{member.full_name}</h1>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(member.status)}`}>
                {member.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Member code {member.member_code} with mobile-safe profile, contact, and lifecycle visibility.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Phone" value={member.phone} />
        <DetailCard label="Joining Date" value={formatDate(member.joining_date)} />
        <DetailCard label="Leaving Date" value={formatDate(member.leaving_date)} />
        <DetailCard label="Gender" value={member.gender.charAt(0).toUpperCase() + member.gender.slice(1)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Profile Overview</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailCard label="Full Name" value={member.full_name} />
            <DetailCard label="Guardian Name" value={member.guardian_name || "-"} />
            <DetailCard label="Member Code" value={member.member_code} />
            <DetailCard label="ID Number" value={member.id_number || "-"} />
            <DetailCard label="Emergency Contact" value={member.emergency_contact || "-"} />
            <DetailCard label="Status" value={member.status.replace("_", " ")} />
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Lifecycle</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Resident Since</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(member.joining_date)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Leaving Date</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(member.leaving_date)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current Status</p>
              <p className="mt-1 text-sm font-medium text-slate-900 capitalize">{member.status.replace("_", " ")}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-5 xl:col-span-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Address and Notes</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Address</p>
              <p className="mt-1 text-sm leading-6 text-slate-800">{member.address || "No address provided."}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Remarks</p>
              <p className="mt-1 text-sm leading-6 text-slate-800">{member.remarks || "No remarks recorded."}</p>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Contact Actions</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Primary Phone</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{member.phone}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Emergency Contact</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{member.emergency_contact || "Not available"}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Keep emergency contact details current so wardens and staff can act quickly during incidents.
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
