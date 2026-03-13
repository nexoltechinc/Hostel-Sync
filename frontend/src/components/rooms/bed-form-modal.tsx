"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { BedWritePayload, Room } from "@/lib/types";

const bedSchema = z.object({
  room: z.number().int().positive("Room id is required"),
  label: z.string().min(1, "Bed label is required"),
  is_active: z.boolean(),
});

type BedFormValues = z.infer<typeof bedSchema>;

type BedFormModalProps = {
  isOpen: boolean;
  rooms: Room[];
  defaultRoomId?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: BedWritePayload) => Promise<void> | void;
};

function defaultValues(defaultRoomId?: number): BedFormValues {
  return {
    room: defaultRoomId ?? 0,
    label: "",
    is_active: true,
  };
}

export function BedFormModal({ isOpen, rooms, defaultRoomId, isSubmitting, onClose, onSubmit }: BedFormModalProps) {
  const form = useForm<BedFormValues>({
    resolver: zodResolver(bedSchema),
    defaultValues: defaultValues(defaultRoomId),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues(defaultRoomId));
    }
  }, [defaultRoomId, form, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/65 p-4">
      <div className="panel w-full max-w-lg p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add Bed</h2>
            <p className="text-sm text-slate-600">Create a new bed record for a room.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bed form"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              room: Number(values.room),
              label: values.label.trim(),
              is_active: values.is_active,
            });
          })}
        >
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Room</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
              {...form.register("room", { valueAsNumber: true })}
            >
              <option value={0}>Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_code}
                </option>
              ))}
            </select>
            {form.formState.errors.room ? <span className="text-xs text-rose-600">{form.formState.errors.room.message}</span> : null}
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Bed Label</span>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
              {...form.register("label")}
            />
            {form.formState.errors.label ? <span className="text-xs text-rose-600">{form.formState.errors.label.message}</span> : null}
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("is_active")} />
            Bed is active
          </label>

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
              {isSubmitting ? "Saving..." : "Add Bed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
