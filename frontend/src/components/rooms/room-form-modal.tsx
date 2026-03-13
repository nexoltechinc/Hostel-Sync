"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues(room));
    }
  }, [form, isOpen, room]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/65 p-4">
      <div className="panel max-h-[95vh] w-full max-w-2xl overflow-y-auto p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{mode === "create" ? "Create Room" : "Edit Room"}</h2>
            <p className="text-sm text-slate-600">Maintain room metadata and bed structure configuration.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close room form"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-4"
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
          <div className="grid gap-3 md:grid-cols-2">
            {showHostelField ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Hostel ID</span>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("floor")}
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Capacity</span>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("capacity", { valueAsNumber: true })}
              />
              {form.formState.errors.capacity ? (
                <span className="text-xs text-rose-600">{form.formState.errors.capacity.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Room Type</span>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("monthly_rent")}
              />
            </label>

            {mode === "create" ? (
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Bed Labels (comma separated, optional)</span>
                <input
                  type="text"
                  placeholder="A1, A2, A3"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                  {...form.register("bed_labels")}
                />
                <p className="text-xs text-slate-500">Leave blank to auto-generate beds as B1..Bn based on capacity.</p>
              </label>
            ) : (
              <p className="text-xs text-slate-500 md:col-span-2">
                Bed labels are managed separately using the room&apos;s Bed Management section.
              </p>
            )}

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 md:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("is_active")} />
              Room is active
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Room" : "Update Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
