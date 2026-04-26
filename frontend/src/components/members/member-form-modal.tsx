"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, FileUp, QrCode, Sparkles, X } from "lucide-react";
import { useState } from "react";
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
  if (!isOpen) {
    return null;
  }

  const modalKey = `${mode}-${member?.id ?? "new"}-${showHostelField ? "multi-hostel" : "single-hostel"}`;

  return (
    <MemberFormModalInner
      key={modalKey}
      isOpen={isOpen}
      mode={mode}
      member={member}
      showHostelField={showHostelField}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function MemberFormModalInner({
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
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [qrPreviewReady, setQrPreviewReady] = useState(false);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [documentNames, setDocumentNames] = useState<string[]>([]);

  function onPhotoSelected(files: FileList | null) {
    const file = files?.[0];
    setPhotoName(file ? file.name : null);
  }

  function onDocumentsSelected(files: FileList | null) {
    if (!files || files.length === 0) {
      setDocumentNames([]);
      return;
    }

    setDocumentNames(Array.from(files).map((file) => file.name));
  }

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
                Resident onboarding
              </span>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-text-strong)]">{mode === "create" ? "Create Member" : "Edit Member"}</h2>
              <p className="text-sm text-[var(--color-text-soft)]">Maintain profile, residency, and communication details from one flow.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close member form"
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
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-6">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="members-upload-card cursor-pointer">
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => onPhotoSelected(event.target.files)} />
                <span className="app-icon-surface inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[#4f7fff]">
                  <Camera className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-text-strong)]">Profile Photo</span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">{photoName ?? "Drag and drop or click to upload"}</span>
              </label>

              <label className="members-upload-card cursor-pointer">
                <input type="file" multiple className="sr-only" onChange={(event) => onDocumentsSelected(event.target.files)} />
                <span className="app-icon-surface inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[#159f83]">
                  <FileUp className="h-5 w-5" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-[var(--color-text-strong)]">Documents</span>
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                  {documentNames.length > 0 ? `${documentNames.length} file(s) selected` : "Attach ID, agreement, or records"}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Personal and hostel details</p>
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
                <span className="text-sm font-medium text-slate-700">Member Code</span>
                <input
                  type="text"
                  className="members-input"
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
                className="members-input"
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
                className="members-input"
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
                className="members-input"
                {...form.register("guardian_name")}
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Emergency Contact</span>
              <input
                type="text"
                className="members-input"
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
                className="members-input"
                {...form.register("joining_date")}
              />
              {form.formState.errors.joining_date ? (
                <span className="text-xs text-rose-600">{form.formState.errors.joining_date.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Gender</span>
              <select
                className="members-select"
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
                className="members-select"
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
                  className="members-input"
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
                className="members-input"
                {...form.register("id_number")}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Address</span>
              <textarea
                rows={2}
                className="members-textarea"
                {...form.register("address")}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Member Details</span>
              <textarea
                rows={4}
                className="members-textarea"
                placeholder="Write member details, notes, preferences, or special instructions..."
                {...form.register("remarks")}
              />
            </label>

            <section className="app-subtle-card md:col-span-2 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-strong)]">Welcome Notification</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Send a welcome message after saving this profile.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWelcomeEnabled((value) => !value)}
                  data-checked={welcomeEnabled}
                  className="app-toggle inline-flex h-7 w-12 items-center rounded-full border px-1 transition"
                  aria-pressed={welcomeEnabled}
                  aria-label="Toggle welcome notification"
                >
                  <span className={`h-5 w-5 rounded-full bg-white transition ${welcomeEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </section>

            <section className="app-subtle-card md:col-span-2 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-strong)]">Check-in QR</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Generate a quick QR for reception check-ins.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQrPreviewReady(true)}
                  className="app-secondary-button inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition"
                >
                  <QrCode className="h-4 w-4" />
                  Generate QR
                </button>
              </div>
              {qrPreviewReady ? (
                <div className="app-primary-note mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
                  <QrCode className="h-4 w-4" />
                  QR preview is ready and can be attached after save.
                </div>
              ) : null}
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
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Member" : "Update Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
