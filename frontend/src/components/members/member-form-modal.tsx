"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { Member, MemberGender, MemberStatus, MemberWritePayload } from "@/lib/types";

const phonePattern = /^[\d+\-()\s]{7,20}$/;

const memberSchema = z
  .object({
    hostel: z.string().optional(),
    member_code: z.string().min(1, "Member code is required"),
    full_name: z.string().min(1, "Full name is required"),
    guardian_name: z.string().optional(),
    id_number: z.string().optional(),
    phone: z.string().min(1, "Phone is required").regex(phonePattern, "Phone format is invalid"),
    emergency_contact: z.string().optional().refine((value) => !value || phonePattern.test(value), {
      message: "Emergency contact format is invalid",
    }),
    address: z.string().optional(),
    joining_date: z.string().min(1, "Joining date is required"),
    gender: z.enum(["male", "female", "other"]),
    status: z.enum(["active", "inactive", "checked_out"]),
    leaving_date: z.string().optional(),
    remarks: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status !== "active" && !value.leaving_date) {
      ctx.addIssue({
        code: "custom",
        path: ["leaving_date"],
        message: "Leaving date is required for inactive or checked-out members.",
      });
    }
  });

type MemberFormValues = z.infer<typeof memberSchema>;

type MemberFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  member?: Member | null;
  showHostelField: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: MemberWritePayload) => Promise<void> | void;
};

function defaultValues(member?: Member | null): MemberFormValues {
  if (!member) {
    return {
      hostel: "",
      member_code: "",
      full_name: "",
      guardian_name: "",
      id_number: "",
      phone: "",
      emergency_contact: "",
      address: "",
      joining_date: new Date().toISOString().slice(0, 10),
      gender: "male",
      status: "active",
      leaving_date: "",
      remarks: "",
    };
  }

  return {
    hostel: String(member.hostel ?? ""),
    member_code: member.member_code,
    full_name: member.full_name,
    guardian_name: member.guardian_name || "",
    id_number: member.id_number || "",
    phone: member.phone,
    emergency_contact: member.emergency_contact || "",
    address: member.address || "",
    joining_date: member.joining_date,
    gender: member.gender,
    status: member.status,
    leaving_date: member.leaving_date ?? "",
    remarks: member.remarks || "",
  };
}

export function MemberFormModal({
  isOpen,
  mode,
  member,
  showHostelField,
  isSubmitting,
  onClose,
  onSubmit,
}: MemberFormModalProps) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: defaultValues(member),
  });

  const currentStatus = useWatch({
    control: form.control,
    name: "status",
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues(member));
    }
  }, [form, isOpen, member]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/65 sm:grid sm:place-items-center sm:p-4">
      <div className="panel flex h-[100dvh] w-full flex-col rounded-none border-0 sm:h-auto sm:max-h-[95vh] sm:max-w-3xl sm:rounded-[1.75rem] sm:border">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-[var(--color-surface)]/95 px-4 py-4 backdrop-blur md:px-6" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{mode === "create" ? "Create Member" : "Edit Member"}</h2>
            <p className="text-sm text-slate-600">Maintain member profile and lifecycle details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close member form"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(async (values) => {
            if (showHostelField && !values.hostel?.trim()) {
              form.setError("hostel", { type: "manual", message: "Hostel id is required for superuser accounts." });
              return;
            }

            await onSubmit({
              ...(showHostelField && values.hostel ? { hostel: Number(values.hostel) } : {}),
              member_code: values.member_code.trim(),
              full_name: values.full_name.trim(),
              guardian_name: values.guardian_name?.trim() || "",
              id_number: values.id_number?.trim() || "",
              phone: values.phone.trim(),
              emergency_contact: values.emergency_contact?.trim() || "",
              address: values.address?.trim() || "",
              joining_date: values.joining_date,
              gender: values.gender as MemberGender,
              status: values.status as MemberStatus,
              leaving_date: values.status === "active" ? null : values.leaving_date || null,
              remarks: values.remarks?.trim() || "",
            });
          })}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            <div className="grid gap-3 md:grid-cols-2">
              {showHostelField ? (
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Hostel ID</span>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                    {...form.register("hostel")}
                  />
                  {form.formState.errors.hostel ? (
                    <span className="text-xs text-rose-600">{form.formState.errors.hostel.message}</span>
                  ) : null}
                </label>
              ) : null}

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Member Code</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                  {...form.register("member_code")}
                />
                {form.formState.errors.member_code ? (
                  <span className="text-xs text-rose-600">{form.formState.errors.member_code.message}</span>
                ) : null}
              </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Full Name</span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("full_name")}
              />
              {form.formState.errors.full_name ? (
                <span className="text-xs text-rose-600">{form.formState.errors.full_name.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("phone")}
              />
              {form.formState.errors.phone ? (
                <span className="text-xs text-rose-600">{form.formState.errors.phone.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Guardian Name</span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("guardian_name")}
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Emergency Contact</span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("emergency_contact")}
              />
              {form.formState.errors.emergency_contact ? (
                <span className="text-xs text-rose-600">{form.formState.errors.emergency_contact.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Joining Date</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("joining_date")}
              />
              {form.formState.errors.joining_date ? (
                <span className="text-xs text-rose-600">{form.formState.errors.joining_date.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Gender</span>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("gender")}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("status")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="checked_out">Checked Out</option>
              </select>
            </label>

            {currentStatus !== "active" ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Leaving Date</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                  {...form.register("leaving_date")}
                />
                {form.formState.errors.leaving_date ? (
                  <span className="text-xs text-rose-600">{form.formState.errors.leaving_date.message}</span>
                ) : null}
              </label>
            ) : null}

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">ID Number</span>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("id_number")}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Address</span>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("address")}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Remarks</span>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
                {...form.register("remarks")}
              />
            </label>
          </div>
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-[var(--color-surface)]/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end md:px-6" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[var(--color-brand-600)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Member" : "Update Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
