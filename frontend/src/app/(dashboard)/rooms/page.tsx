"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BedSingle,
  Building2,
  CircleDot,
  Filter,
  Layers3,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BedFormModal } from "@/components/rooms/bed-form-modal";
import { RoomFormModal } from "@/components/rooms/room-form-modal";
import {
  useCreateBed,
  useCreateRoom,
  useDeleteBed,
  useDeleteRoom,
  useRooms,
  useUpdateBed,
  useUpdateRoom,
} from "@/hooks/use-rooms";
import { useSession } from "@/hooks/use-session";
import type { RoomsQueryParams } from "@/lib/api";
import type { Bed, BedWritePayload, Room, RoomType, RoomWritePayload } from "@/lib/types";

function isManageRoomsAllowed(permissions: string[]) {
  return permissions.includes("*") || permissions.includes("manage_rooms");
}

function isSuperuser(permissions: string[]) {
  return permissions.includes("*");
}

function bedStatus(bed: Bed) {
  if (!bed.is_active) {
    return { label: "Inactive", className: "border-slate-400/35 bg-slate-500/14 text-slate-200" };
  }
  if (bed.is_occupied) {
    return { label: "Occupied", className: "border-rose-300/40 bg-rose-500/12 text-rose-200" };
  }
  return { label: "Available", className: "border-emerald-300/40 bg-emerald-500/10 text-emerald-200" };
}

function roomTypeLabel(value: RoomType) {
  if (value === "standard") {
    return "Standard";
  }
  if (value === "deluxe") {
    return "Deluxe";
  }
  return "Private";
}

function occupancyRate(room: Room) {
  if (room.capacity <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((room.occupied_beds / room.capacity) * 100)));
}

function getPaginationWindow(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
  return Array.from({ length: 5 }, (_, idx) => start + idx);
}

function InventoryLoadingSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 6 }, (_, index) => (
        <article
          key={index}
          className="rooms-animate-rise relative min-h-[220px] overflow-hidden rounded-[24px] border"
          style={{
            animationDelay: `${index * 55}ms`,
            borderColor: "var(--color-border)",
          }}
        >
          <div className="rooms-skeleton absolute inset-0" />
        </article>
      ))}
    </div>
  );
}

export default function RoomsPage() {
  const { data: sessionData } = useSession();
  const permissions = sessionData?.user.permissions ?? [];
  const canManageRooms = isManageRoomsAllowed(permissions);
  const showHostelField = isSuperuser(permissions);

  const [searchInput, setSearchInput] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | "all">("all");
  const [activeFilter, setActiveFilter] = useState<boolean | "all">("all");
  const [page, setPage] = useState(1);
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isBedModalOpen, setIsBedModalOpen] = useState(false);
  const [selectedRoomForBed, setSelectedRoomForBed] = useState<number | undefined>(undefined);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const params = useMemo<RoomsQueryParams>(
    () => ({
      search: searchInput,
      room_type: roomTypeFilter,
      is_active: activeFilter,
      ordering: "room_code",
      page,
    }),
    [activeFilter, page, roomTypeFilter, searchInput],
  );

  const roomsQuery = useRooms(params);
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const deleteRoomMutation = useDeleteRoom();
  const createBedMutation = useCreateBed();
  const updateBedMutation = useUpdateBed();
  const deleteBedMutation = useDeleteBed();

  const rooms = useMemo(() => roomsQuery.data?.results ?? [], [roomsQuery.data?.results]);
  const isMutating =
    createRoomMutation.isPending ||
    updateRoomMutation.isPending ||
    deleteRoomMutation.isPending ||
    createBedMutation.isPending ||
    updateBedMutation.isPending ||
    deleteBedMutation.isPending;
  const totalPages = Math.max(1, Math.ceil((roomsQuery.data?.count ?? 0) / 20));
  const paginationWindow = useMemo(() => getPaginationWindow(page, totalPages), [page, totalPages]);
  const activeFiltersCount = Number(Boolean(searchInput.trim())) + Number(roomTypeFilter !== "all") + Number(activeFilter !== "all");

  const roomStats = useMemo(() => {
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    const totalOccupied = rooms.reduce((sum, room) => sum + room.occupied_beds, 0);
    const totalAvailable = rooms.reduce((sum, room) => sum + room.available_beds, 0);
    const activeRooms = rooms.filter((room) => room.is_active).length;
    const utilization = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    return {
      totalCapacity,
      totalOccupied,
      totalAvailable,
      activeRooms,
      utilization,
    };
  }, [rooms]);

  async function submitRoom(payload: RoomWritePayload) {
    setErrorMessage(null);
    setFeedback(null);

    try {
      if (editingRoom) {
        await updateRoomMutation.mutateAsync({ roomId: editingRoom.id, payload });
        setFeedback("Room updated successfully.");
      } else {
        await createRoomMutation.mutateAsync(payload);
        setFeedback("Room created successfully.");
      }
      setIsRoomModalOpen(false);
      setEditingRoom(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save room.");
    }
  }

  async function submitBed(payload: BedWritePayload) {
    setErrorMessage(null);
    setFeedback(null);

    try {
      await createBedMutation.mutateAsync(payload);
      setFeedback("Bed added successfully.");
      setIsBedModalOpen(false);
      setSelectedRoomForBed(undefined);
      setExpandedRoomId(payload.room);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add bed.");
    }
  }

  async function toggleRoomActive(room: Room) {
    if (!canManageRooms) {
      return;
    }
    setErrorMessage(null);
    setFeedback(null);

    try {
      await updateRoomMutation.mutateAsync({
        roomId: room.id,
        payload: { is_active: !room.is_active },
      });
      setFeedback(`Room ${room.room_code} ${room.is_active ? "deactivated" : "activated"} successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update room status.");
    }
  }

  async function deleteRoomRecord(room: Room) {
    if (!canManageRooms) {
      return;
    }

    const confirmed = window.confirm(`Delete room "${room.room_code}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setFeedback(null);

    try {
      await deleteRoomMutation.mutateAsync(room.id);
      setFeedback("Room deleted successfully.");
      if (expandedRoomId === room.id) {
        setExpandedRoomId(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete room.");
    }
  }

  async function toggleBedActive(bed: Bed) {
    if (!canManageRooms || bed.is_occupied) {
      return;
    }

    setErrorMessage(null);
    setFeedback(null);

    try {
      await updateBedMutation.mutateAsync({
        bedId: bed.id,
        payload: { is_active: !bed.is_active },
      });
      setFeedback(`Bed ${bed.label} ${bed.is_active ? "deactivated" : "activated"} successfully.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update bed status.");
    }
  }

  async function deleteBedRecord(bed: Bed) {
    if (!canManageRooms) {
      return;
    }

    const confirmed = window.confirm(`Delete bed "${bed.label}"?`);
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setFeedback(null);

    try {
      await deleteBedMutation.mutateAsync(bed.id);
      setFeedback("Bed deleted successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete bed.");
    }
  }

  return (
    <section className="space-y-5 pb-2 md:space-y-6">
      <header className="panel panel-soft panel-elevated dashboard-fade-up relative overflow-hidden p-5 md:p-6">
        <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-[1] flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="dashboard-chip w-fit">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Room Operations Suite
              </p>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">Room Management</h1>
                <p className="max-w-3xl text-sm text-slate-300">
                  Manage room inventory, bed-level structure, and occupancy in one premium workspace.
                </p>
              </div>
            </div>

            {canManageRooms ? (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoom(null);
                    setIsRoomModalOpen(true);
                  }}
                  className="dashboard-cta dashboard-cta-primary w-full sm:w-auto"
                >
                  <Building2 className="h-4 w-4" />
                  New Room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoomForBed(undefined);
                    setIsBedModalOpen(true);
                  }}
                  className="dashboard-cta dashboard-cta-secondary w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  New Bed
                </button>
              </div>
            ) : (
              <p className="dashboard-chip w-fit text-[11px] uppercase tracking-[0.12em]">View-only access</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="dashboard-chip">
              <Layers3 className="h-3.5 w-3.5" />
              {roomsQuery.data?.count ?? 0} total rooms
            </span>
            <span className="dashboard-chip">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
              {roomStats.activeRooms} active
            </span>
            {activeFiltersCount > 0 ? (
              <span className="dashboard-chip">
                <Filter className="h-3.5 w-3.5 text-blue-300" />
                {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} applied
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {feedback ? (
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-sm text-emerald-200">{feedback}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-rose-400/35 bg-rose-500/12 px-3 py-2 text-sm text-rose-200">{errorMessage}</div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rooms-overview-card dashboard-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total Capacity</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-slate-100">{roomStats.totalCapacity}</p>
            <Layers3 className="h-4 w-4 text-cyan-300" />
          </div>
        </article>
        <article className="rooms-overview-card dashboard-fade-up" style={{ animationDelay: "40ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Occupied Beds</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-slate-100">{roomStats.totalOccupied}</p>
            <BedSingle className="h-4 w-4 text-rose-300" />
          </div>
        </article>
        <article className="rooms-overview-card dashboard-fade-up" style={{ animationDelay: "80ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Available Beds</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-slate-100">{roomStats.totalAvailable}</p>
            <BadgeCheck className="h-4 w-4 text-emerald-300" />
          </div>
        </article>
        <article className="rooms-overview-card dashboard-fade-up" style={{ animationDelay: "120ms" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Utilization</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-slate-100">{roomStats.utilization}%</p>
            <CircleDot className="h-4 w-4 text-blue-300" />
          </div>
          <div className="dashboard-progress-track mt-3 h-1.5">
            <div
              className="dashboard-progress-fill h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400"
              style={{ width: `${roomStats.utilization}%` }}
            />
          </div>
        </article>
      </section>

      <section className="panel panel-soft rooms-command rounded-[24px] border p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-100">
              <Filter className="h-4 w-4 text-blue-300" />
              Inventory filters
            </p>
            <p className="text-xs text-slate-400">Narrow by room code, type, and active status with smooth list updates.</p>
          </div>
          {roomsQuery.isFetching && !roomsQuery.isLoading ? <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Refreshing...</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_190px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setPage(1);
                setSearchInput(event.target.value);
              }}
              placeholder="Search by room code or floor"
              className="rooms-input w-full py-2.5 pl-9 pr-3 sm:col-span-2 xl:col-span-1"
            />
          </label>

          <select
            value={roomTypeFilter}
            onChange={(event) => {
              setPage(1);
              setRoomTypeFilter(event.target.value as RoomType | "all");
            }}
            className="rooms-select py-2.5"
          >
            <option value="all">All room types</option>
            <option value="standard">Standard</option>
            <option value="deluxe">Deluxe</option>
            <option value="private">Private</option>
          </select>

          <select
            value={activeFilter === "all" ? "all" : activeFilter ? "true" : "false"}
            onChange={(event) => {
              setPage(1);
              if (event.target.value === "all") {
                setActiveFilter("all");
                return;
              }
              setActiveFilter(event.target.value === "true");
            }}
            className="rooms-select py-2.5"
          >
            <option value="all">All rooms</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSearchInput("");
              setRoomTypeFilter("all");
              setActiveFilter("all");
            }}
            disabled={activeFiltersCount === 0}
            className="dashboard-cta dashboard-cta-secondary w-full justify-center py-2.5 text-xs uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {roomsQuery.isLoading ? (
          <InventoryLoadingSkeleton />
        ) : roomsQuery.isError ? (
          <div className="panel rounded-[24px] border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-200">
            {roomsQuery.error instanceof Error ? roomsQuery.error.message : "Failed to load rooms."}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rooms-empty panel panel-soft grid min-h-[280px] place-items-center rounded-[24px] border p-6 text-center">
            <div className="space-y-3">
              <p className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-400/35 bg-blue-500/12 text-blue-200">
                <Building2 className="h-5 w-5" />
              </p>
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-100">No rooms found</p>
                <p className="text-sm text-slate-400">Adjust your filters or add the first room to start building inventory.</p>
              </div>
              {canManageRooms ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoom(null);
                    setIsRoomModalOpen(true);
                  }}
                  className="dashboard-cta dashboard-cta-primary"
                >
                  <Plus className="h-4 w-4" />
                  Add New Room
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {rooms.map((room, index) => {
              const occupancy = occupancyRate(room);
              const occupancyTone =
                occupancy >= 85 ? "text-rose-300" : occupancy >= 60 ? "text-amber-300" : "text-emerald-300";

              return (
                <article
                  key={room.id}
                  className="rooms-card rooms-animate-rise relative overflow-hidden rounded-[22px] border p-3 md:p-4"
                  style={{
                    animationDelay: `${index * 45}ms`,
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-30">
                    <div className="dashboard-grid h-full w-full" />
                  </div>

                  <div className="relative z-[1] space-y-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/rooms/${room.id}`} className="text-base font-semibold tracking-tight text-slate-100 hover:text-[var(--color-brand-600)]">
                            {room.room_code}
                          </Link>
                          <span className="rooms-chip">{roomTypeLabel(room.room_type)}</span>
                          <span className={`rooms-chip ${room.is_active ? "rooms-chip-active" : "rooms-chip-muted"}`}>
                            {room.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Floor / Block: <span className="font-medium text-slate-200">{room.floor || "-"}</span>
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-right">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Occupancy</p>
                        <p className={`text-sm font-semibold ${occupancyTone}`}>{occupancy}%</p>
                      </div>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-3">
                      <div className="rooms-stat">
                        <p className="rooms-stat-label">
                          <Layers3 className="h-3.5 w-3.5" />
                          Capacity
                        </p>
                        <p className="rooms-stat-value">{room.capacity}</p>
                      </div>
                      <div className="rooms-stat">
                        <p className="rooms-stat-label">
                          <BedSingle className="h-3.5 w-3.5" />
                          Occupied
                        </p>
                        <p className="rooms-stat-value">{room.occupied_beds}</p>
                      </div>
                      <div className="rooms-stat">
                        <p className="rooms-stat-label">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Available
                        </p>
                        <p className="rooms-stat-value">{room.available_beds}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpandedRoomId((current) => (current === room.id ? null : room.id))}
                        className="dashboard-cta dashboard-cta-secondary px-2.5 py-1 text-[11px]"
                      >
                        <BedSingle className="h-3.5 w-3.5" />
                        {expandedRoomId === room.id ? "Hide Beds" : "Manage Beds"}
                      </button>

                      {canManageRooms ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoom(room);
                              setIsRoomModalOpen(true);
                            }}
                            className="dashboard-cta dashboard-cta-secondary px-2.5 py-1 text-[11px]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoomForBed(room.id);
                              setIsBedModalOpen(true);
                            }}
                            className="dashboard-cta dashboard-cta-secondary px-2.5 py-1 text-[11px]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Bed
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRoomActive(room)}
                            disabled={isMutating}
                            className={`dashboard-cta px-2.5 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60 ${room.is_active ? "border-amber-300/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/16" : "border-emerald-300/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/16"}`}
                          >
                            <TriangleAlert className="h-3.5 w-3.5" />
                            {room.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRoomRecord(room)}
                            disabled={isMutating}
                            className="dashboard-cta border-rose-300/40 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 hover:bg-rose-500/16 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>

                    {expandedRoomId === room.id ? (
                      <div className="rounded-xl border border-white/14 bg-black/20 p-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Bed Inventory</p>
                        {room.beds.length === 0 ? (
                          <p className="text-sm text-slate-400">No beds configured for this room yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {room.beds.map((bed) => {
                              const state = bedStatus(bed);
                              return (
                                <div
                                  key={bed.id}
                                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div>
                                    <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-100">
                                      <BedSingle className="h-4 w-4 text-slate-400" />
                                      {bed.label}
                                    </p>
                                    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${state.className}`}>
                                      {state.label}
                                    </span>
                                  </div>
                                  {canManageRooms ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => toggleBedActive(bed)}
                                        disabled={isMutating || bed.is_occupied}
                                        className="dashboard-cta dashboard-cta-secondary px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {bed.is_active ? "Deactivate" : "Activate"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteBedRecord(bed)}
                                        disabled={isMutating}
                                        className="dashboard-cta border-rose-300/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/16 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel panel-soft flex flex-col gap-3 rounded-[20px] border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <p className="text-sm text-slate-400">Total rooms: {roomsQuery.data?.count ?? 0}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(value - 1, 1))}
            disabled={!roomsQuery.data?.previous || roomsQuery.isLoading}
            className="dashboard-cta dashboard-cta-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>

          {paginationWindow.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
                pageNumber === page
                  ? "border-blue-300/45 bg-blue-500/20 text-blue-100 shadow-[0_0_0_1px_rgba(96,165,250,0.25)]"
                  : "border-white/15 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
            disabled={!roomsQuery.data?.next || roomsQuery.isLoading}
            className="dashboard-cta dashboard-cta-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <RoomFormModal
        isOpen={isRoomModalOpen}
        mode={editingRoom ? "edit" : "create"}
        room={editingRoom}
        showHostelField={showHostelField}
        isSubmitting={isMutating}
        onClose={() => {
          setIsRoomModalOpen(false);
          setEditingRoom(null);
        }}
        onSubmit={submitRoom}
      />

      <BedFormModal
        isOpen={isBedModalOpen}
        rooms={rooms}
        defaultRoomId={selectedRoomForBed}
        isSubmitting={isMutating}
        onClose={() => {
          setIsBedModalOpen(false);
          setSelectedRoomForBed(undefined);
        }}
        onSubmit={submitBed}
      />
    </section>
  );
}
