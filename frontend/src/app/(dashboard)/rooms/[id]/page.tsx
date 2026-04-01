"use client";

import { ArrowLeft, BedSingle, Building2, CircleDollarSign, LoaderCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { useRoom } from "@/hooks/use-rooms";

function formatCurrency(value: string | null) {
  if (!value) {
    return "-";
  }
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return value;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function bedStatus(isActive: boolean, isOccupied: boolean) {
  if (!isActive) {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  if (isOccupied) {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }
  return "border-emerald-300 bg-emerald-50 text-emerald-700";
}

function roomStatus(isActive: boolean) {
  return isActive ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700";
}

function DetailCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default function RoomDetailPage({ params }: { params: { id: string } }) {
  const roomId = Number(params.id);
  const roomQuery = useRoom(Number.isFinite(roomId) ? roomId : null);

  if (roomQuery.isLoading) {
    return (
      <section className="grid min-h-[40vh] place-items-center">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading room details...
        </div>
      </section>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <section className="space-y-4">
        <Link href="/rooms" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to rooms
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {roomQuery.error instanceof Error ? roomQuery.error.message : "Unable to load room details."}
        </div>
      </section>
    );
  }

  const room = roomQuery.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link href="/rooms" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to rooms
          </Link>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Room Detail</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{room.room_code}</h1>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${roomStatus(room.is_active)}`}>
                {room.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Occupancy-safe view for room structure, bed inventory, and current capacity on mobile and desktop.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Room Type" value={room.room_type.replace("_", " ")} />
        <DetailCard label="Capacity" value={room.capacity} />
        <DetailCard label="Occupied Beds" value={room.occupied_beds} />
        <DetailCard label="Monthly Rent" value={formatCurrency(room.monthly_rent)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Room Overview</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailCard label="Room Code" value={room.room_code} />
            <DetailCard label="Floor / Block" value={room.floor || "-"} />
            <DetailCard label="Room Type" value={room.room_type.replace("_", " ")} />
            <DetailCard label="Available Beds" value={room.available_beds} />
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Operational Notes</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Rent</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatCurrency(room.monthly_rent)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Active Beds</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{room.beds.filter((bed) => bed.is_active).length}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Review inactive beds before new allotments so staff do not assign unavailable capacity by mistake.
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2">
          <BedSingle className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Bed Inventory</h2>
        </div>

        {room.beds.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            No beds configured for this room yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {room.beds.map((bed) => (
              <article key={bed.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{bed.label}</p>
                    <p className="text-xs text-slate-500">Bed ID {bed.id}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${bedStatus(bed.is_active, bed.is_occupied)}`}>
                    {!bed.is_active ? "Inactive" : bed.is_occupied ? "Occupied" : "Available"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Active</p>
                    <p className="font-medium text-slate-800">{bed.is_active ? "Yes" : "No"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Occupied</p>
                    <p className="font-medium text-slate-800">{bed.is_occupied ? "Yes" : "No"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
