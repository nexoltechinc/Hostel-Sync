"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BedSingle,
  Building2,
  Filter,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { IconBadge } from "@/components/ui/icon-badge";
import { SectionHeading } from "@/components/ui/section-heading";
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
import { moduleIcons } from "@/lib/app-icons";
import type { RoomsQueryParams } from "@/lib/api";
import type { Bed, BedWritePayload, Room, RoomType, RoomWritePayload } from "@/lib/types";

function isManageRoomsAllowed(permissions: string[]) {
  return permissions.includes("*") || permissions.includes("manage_rooms");
}

function isSuperuser(permissions: string[]) {
  return permissions.includes("*");
}

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

function bedStatus(bed: Bed) {
  if (!bed.is_active) {
    return { label: "Inactive", className: "border-slate-300 bg-slate-100 text-slate-700" };
  }
  if (bed.is_occupied) {
    return { label: "Occupied", className: "border-rose-300 bg-rose-50 text-rose-700" };
  }
  return { label: "Available", className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
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

  const rooms = roomsQuery.data?.results ?? [];
  const isMutating =
    createRoomMutation.isPending ||
    updateRoomMutation.isPending ||
    deleteRoomMutation.isPending ||
    createBedMutation.isPending ||
    updateBedMutation.isPending ||
    deleteBedMutation.isPending;

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
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading
          icon={moduleIcons.rooms}
          eyebrow="Module 4"
          title="Room Management"
          description="Manage room inventory, bed-level structure, and availability with real-time occupancy visibility."
        />

        {canManageRooms ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingRoom(null);
                setIsRoomModalOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-brand-700)] sm:w-auto"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              New Bed
            </button>
          </div>
        ) : (
          <p className="text-xs uppercase tracking-[0.1em] text-slate-500">View-only access</p>
        )}
      </header>

      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</div> : null}
      {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</div> : null}

      <section className="panel p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <IconBadge icon={Filter} size="sm" />
          <div>
            <p className="text-sm font-medium text-slate-900">Inventory filters</p>
            <p className="text-xs text-slate-500">Narrow rooms by type, active state, and room code without losing occupancy context.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setPage(1);
                setSearchInput(event.target.value);
              }}
              placeholder="Search by room number or floor"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)] sm:col-span-2 xl:col-span-1"
            />
          </label>

          <select
            value={roomTypeFilter}
            onChange={(event) => {
              setPage(1);
              setRoomTypeFilter(event.target.value as RoomType | "all");
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
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
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
          >
            <option value="all">All rooms</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {roomsQuery.isLoading ? (
          <div className="panel grid min-h-[260px] place-items-center text-sm text-slate-500">
            <div className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading room inventory...
            </div>
          </div>
        ) : roomsQuery.isError ? (
          <div className="panel p-5 text-sm text-rose-700">
            {roomsQuery.error instanceof Error ? roomsQuery.error.message : "Failed to load rooms."}
          </div>
        ) : rooms.length === 0 ? (
          <div className="panel grid min-h-[220px] place-items-center p-5 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">No rooms found</p>
              <p className="text-xs text-slate-500">Adjust filters or create a room to initialize accommodation inventory.</p>
            </div>
          </div>
        ) : (
          rooms.map((room) => (
            <article key={room.id} className="panel p-4 md:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/rooms/${room.id}`} className="text-lg font-semibold text-slate-900 hover:text-[var(--color-brand-700)]">
                      {room.room_code}
                    </Link>
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {roomTypeLabel(room.room_type)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${room.is_active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}
                    >
                      {room.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Floor/Block: <span className="font-medium text-slate-700">{room.floor || "-"}</span>
                  </p>
                </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-slate-500">
                    <Layers3 className="h-3.5 w-3.5" />
                    Capacity
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{room.capacity}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-slate-500">
                    <BedSingle className="h-3.5 w-3.5" />
                    Occupied
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{room.occupied_beds}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-slate-500">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Available
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{room.available_beds}</p>
                </div>
              </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-slate-500" />
                  Beds: {room.beds.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-slate-500" />
                  Rent: {formatCurrency(room.monthly_rent)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedRoomId((current) => (current === room.id ? null : room.id))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
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
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
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
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Bed
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRoomActive(room)}
                      disabled={isMutating}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${room.is_active ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                    >
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {room.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRoomRecord(room)}
                      disabled={isMutating}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                ) : null}
              </div>

              {expandedRoomId === room.id ? (
                <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Bed Inventory</p>
                  {room.beds.length === 0 ? (
                    <p className="text-sm text-slate-600">No beds configured for this room yet.</p>
                  ) : (
                    room.beds.map((bed) => {
                      const state = bedStatus(bed);
                      return (
                        <div key={bed.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
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
                                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {bed.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteBedRecord(bed)}
                                disabled={isMutating}
                                className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Total rooms: {roomsQuery.data?.count ?? 0}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(value - 1, 1))}
            disabled={!roomsQuery.data?.previous || roomsQuery.isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-slate-600">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((value) => value + 1)}
            disabled={!roomsQuery.data?.next || roomsQuery.isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
            <ArrowRight className="h-4 w-4" />
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
