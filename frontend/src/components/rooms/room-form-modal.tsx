"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BedSingle, Building2, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { Room, RoomType, RoomWritePayload } from "@/lib/types";

const roomSchema = z.object({
  hostel: z.string().optional(),
  room_code: z.string().min(1, "Room number is required"),
  floor: z.string().optional(),
  capacity: z.number().int().positive("Capacity must be greater than zero"),
  room_type: z.enum(["standard", "deluxe", "private"]),
  monthly_rent: z.string().optional(),
  is_active: z.boolean(),
  bed_labels: z.string().optional(),
});

type RoomFormValues = z.infer<typeof roomSchema>;

type RoomFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  room?: Room | null;
  showHostelField: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: RoomWritePayload) => Promise<void> | void;
};

function defaultValues(room?: Room | null): RoomFormValues {
  if (!room) {
    return {
      hostel: "",
      room_code: "",
      floor: "",
      capacity: 1,
      room_type: "standard",
      monthly_rent: "",
      is_active: true,
      bed_labels: "",
    };
  }

  return {
    hostel: String(room.hostel ?? ""),
    room_code: room.room_code,
    floor: room.floor || "",
    capacity: room.capacity,
    room_type: room.room_type,
    monthly_rent: room.monthly_rent ?? "",
    is_active: room.is_active,
    bed_labels: "",
  };
}

function parseBedLabels(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

export function RoomFormModal({ isOpen, mode, room, showHostelField, isSubmitting, onClose, onSubmit }: RoomFormModalProps) {
  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: defaultValues(room),
  });
  const isRoomActive = useWatch({
    control: form.control,
    name: "is_active",
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues(room));
    }
  }, [form, isOpen, room]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-40 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        className="members-modal-enter panel panel-elevated flex h-[100dvh] w-full flex-col rounded-none border-0 sm:h-auto sm:max-h-[95vh] sm:max-w-4xl sm:rounded-[1.75rem] sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b bg-[var(--color-surface)]/95 px-4 py-4 backdrop-blur md:px-6" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="dashboard-chip">
                <Sparkles className="h-3.5 w-3.5" />
                Room onboarding
              </span>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-text-strong)]">{mode === "create" ? "Create Room" : "Edit Room"}</h2>
              <p className="text-sm text-[var(--color-text-soft)]">Maintain room metadata and bed structure configuration from one flow.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close room form"
              className="app-modal-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="app-progress-track mt-3 h-1.5 overflow-hidden rounded-full">
            <div className="members-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#245df4,#1db5a8)]" />
          </div>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            if (showHostelField && !values.hostel?.trim()) {
              form.setError("hostel", { type: "manual", message: "Hostel id is required for superuser accounts." });
              return;
            }

            const bedLabels = parseBedLabels(values.bed_labels);
            await onSubmit({
              ...(showHostelField && values.hostel ? { hostel: Number(values.hostel) } : {}),
              room_code: values.room_code.trim(),
              floor: values.floor?.trim() || "",
              capacity: Number(values.capacity),
              room_type: values.room_type as RoomType,
              monthly_rent: values.monthly_rent?.trim() ? Number(values.monthly_rent) : null,
              is_active: values.is_active,
              ...(mode === "create" && bedLabels.length > 0 ? { bed_labels: bedLabels } : {}),
            });
          })}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-6">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="members-upload-card">
                <span className="app-icon-surface inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[#4f7fff]">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-text-strong)]">Room Profile</span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Define code, floor, and room type.</span>
              </article>

              <article className="members-upload-card">
                <span className="app-icon-surface inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[#159f83]">
                  <BedSingle className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-text-strong)]">Bed Structure</span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                  {mode === "create" ? "Preconfigure labels for instant room setup." : "Manage labels from the Bed Management section."}
                </span>
              </article>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Room and capacity details</p>
              <span className="dashboard-chip">Step 1 of 1</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {showHostelField ? (
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Hostel ID</span>
                  <input
                    type="number"
                    className="members-input"
                    {...form.register("hostel")}
                  />
                  {form.formState.errors.hostel ? (
                    <span className="text-xs text-rose-600">{form.formState.errors.hostel.message}</span>
                  ) : null}
                </label>
              ) : null}

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Room Number</span>
                <input
                  type="text"
                  className="members-input"
                  {...form.register("room_code")}
                />
                {form.formState.errors.room_code ? (
                  <span className="text-xs text-rose-600">{form.formState.errors.room_code.message}</span>
                ) : null}
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Floor / Block</span>
                <input
                  type="text"
                  className="members-input"
                  {...form.register("floor")}
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Capacity</span>
                <input
                  type="number"
                  min={1}
                  className="members-input"
                  {...form.register("capacity", { valueAsNumber: true })}
                />
                {form.formState.errors.capacity ? (
                  <span className="text-xs text-rose-600">{form.formState.errors.capacity.message}</span>
                ) : null}
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Room Type</span>
                <select
                  className="members-select"
                  {...form.register("room_type")}
                >
                  <option value="standard">Standard</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Monthly Rent</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="members-input"
                  {...form.register("monthly_rent")}
                />
              </label>

              {mode === "create" ? (
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Bed Labels (comma separated, optional)</span>
                  <input
                    type="text"
                    placeholder="A1, A2, A3"
                    className="members-input"
                    {...form.register("bed_labels")}
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">Leave blank to auto-generate beds as B1..Bn based on capacity.</p>
                </label>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] md:col-span-2">
                  Bed labels are managed separately using the room&apos;s Bed Management section.
                </p>
              )}

              <section className="app-subtle-card md:col-span-2 rounded-2xl p-4">
                <input type="checkbox" className="sr-only" {...form.register("is_active")} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-strong)]">Room Availability</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Mark this room as active to keep it available for allocation and operations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => form.setValue("is_active", !isRoomActive, { shouldDirty: true })}
                    data-checked={Boolean(isRoomActive)}
                    className="app-toggle inline-flex h-7 w-12 items-center rounded-full border px-1 transition"
                    aria-pressed={Boolean(isRoomActive)}
                    aria-label="Toggle room availability"
                  >
                    <span className={`h-5 w-5 rounded-full bg-white transition ${isRoomActive ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </section>
            </div>
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-[var(--color-surface)]/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end md:px-6" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="app-secondary-button w-full rounded-xl border px-4 py-3 text-sm font-medium transition sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[linear-gradient(135deg,#5f8cff_0%,#3758ff_58%,#2742cf_100%)] px-4 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(44,73,255,0.32)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Room" : "Update Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
