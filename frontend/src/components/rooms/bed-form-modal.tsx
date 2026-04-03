"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BedSingle, Building2, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  const isBedActive = useWatch({
    control: form.control,
    name: "is_active",
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
    <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4" onClick={onClose}>
      <div
        className="members-modal-enter panel panel-elevated flex h-[100dvh] w-full flex-col rounded-none border-0 sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-[1.75rem] sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b bg-[var(--color-surface)]/95 px-4 py-4 backdrop-blur md:px-6" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="dashboard-chip">
                <Sparkles className="h-3.5 w-3.5" />
                Bed onboarding
              </span>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Add Bed</h2>
              <p className="text-sm text-slate-600">Create a new bed record with operational-ready status and assignment context.</p>
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
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="members-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#245df4,#1db5a8)]" />
          </div>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit({
              room: Number(values.room),
              label: values.label.trim(),
              is_active: values.is_active,
            });
          })}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-6">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="members-upload-card">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#8fb2ff]">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-text-strong)]">Room Linkage</span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Attach this bed to a room inventory record.</span>
              </article>

              <article className="members-upload-card">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#77d0be]">
                  <BedSingle className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-text-strong)]">Bed Identity</span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Define a clear label for assignment operations.</span>
              </article>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Bed details</p>
              <span className="dashboard-chip">Step 1 of 1</span>
            </div>

            <div className="space-y-4">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Room</span>
                <select className="members-select" {...form.register("room", { valueAsNumber: true })}>
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
                <input type="text" className="members-input" placeholder="e.g. A1, B2" {...form.register("label")} />
                {form.formState.errors.label ? <span className="text-xs text-rose-600">{form.formState.errors.label.message}</span> : null}
              </label>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <input type="checkbox" className="sr-only" {...form.register("is_active")} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-strong)]">Bed Availability</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Keep this bed active for resident allocation workflows.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => form.setValue("is_active", !isBedActive, { shouldDirty: true })}
                    className={`inline-flex h-7 w-12 items-center rounded-full border px-1 transition ${
                      isBedActive ? "border-[#4f7fff] bg-[#245df4]" : "border-white/20 bg-white/8"
                    }`}
                    aria-pressed={Boolean(isBedActive)}
                    aria-label="Toggle bed availability"
                  >
                    <span className={`h-5 w-5 rounded-full bg-white transition ${isBedActive ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </section>
            </div>
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-[var(--color-surface)]/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end md:px-6" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-white/18 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[var(--color-text-soft)] transition hover:bg-white/[0.1] sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[linear-gradient(135deg,#5f8cff_0%,#3758ff_58%,#2742cf_100%)] px-4 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(44,73,255,0.32)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? "Saving..." : "Add Bed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
