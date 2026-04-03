"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Control, type FieldPath } from "react-hook-form";
import { z } from "zod";

import { useSession } from "@/hooks/use-session";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import type { SettingsRecord, SettingsUpdatePayload } from "@/lib/types";

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

const settingsFormSchema = z.object({
  hostel: z.object({
    name: z.string().min(1, "Hostel name is required."),
    code: z.string().min(1, "Hostel code is required."),
    address: z.string(),
    phone: z.string(),
    email: z.union([z.string().email("Enter a valid email address."), z.literal("")]),
    timezone: z.string().min(1, "Timezone is required."),
    is_active: z.boolean(),
  }),
  branding: z.object({
    brand_name: z.string(),
    website_url: z.union([z.string().url("Enter a valid URL."), z.literal("")]),
    primary_color: z.string().regex(hexColorPattern, "Use a hex color like #2D6CFF."),
    accent_color: z.string().regex(hexColorPattern, "Use a hex color like #F59E0B."),
  }),
  financial: z.object({
    currency_code: z.string().length(3, "Use a 3-letter currency code."),
    invoice_due_day: z.number().int().min(1).max(28),
    late_fee_amount: z.number().min(0),
    default_security_deposit: z.number().min(0),
    default_admission_fee: z.number().min(0),
    allow_partial_payments: z.boolean(),
    auto_apply_member_credit: z.boolean(),
  }),
  notifications: z.object({
    enable_announcements: z.boolean(),
    enable_fee_reminders: z.boolean(),
    fee_reminder_days_before: z.number().int().min(0).max(30),
    fee_reminder_days_after: z.number().int().min(0).max(30),
    enable_attendance_alerts: z.boolean(),
  }),
  operations: z.object({
    attendance_cutoff_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use a valid time."),
    allow_attendance_corrections: z.boolean(),
    checkout_notice_days: z.number().int().min(0).max(60),
    require_checkout_clearance: z.boolean(),
  }),
  access: z.object({
    allow_admin_manage_users: z.boolean(),
    allow_admin_manage_hostel_settings: z.boolean(),
    allow_warden_view_reports: z.boolean(),
    allow_staff_view_reports: z.boolean(),
  }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;
type SaveTone = "success" | "warning" | "danger" | "default";

function defaultValues(record?: SettingsRecord): SettingsFormValues {
  return {
    hostel: {
      name: record?.hostel.name ?? "",
      code: record?.hostel.code ?? "",
      address: record?.hostel.address ?? "",
      phone: record?.hostel.phone ?? "",
      email: record?.hostel.email ?? "",
      timezone: record?.hostel.timezone ?? "UTC",
      is_active: record?.hostel.is_active ?? true,
    },
    branding: {
      brand_name: record?.branding.brand_name ?? "",
      website_url: record?.branding.website_url ?? "",
      primary_color: record?.branding.primary_color ?? "#2D6CFF",
      accent_color: record?.branding.accent_color ?? "#F59E0B",
    },
    financial: {
      currency_code: record?.financial.currency_code ?? "USD",
      invoice_due_day: record?.financial.invoice_due_day ?? 5,
      late_fee_amount: record?.financial.late_fee_amount ?? 0,
      default_security_deposit: record?.financial.default_security_deposit ?? 0,
      default_admission_fee: record?.financial.default_admission_fee ?? 0,
      allow_partial_payments: record?.financial.allow_partial_payments ?? true,
      auto_apply_member_credit: record?.financial.auto_apply_member_credit ?? true,
    },
    notifications: {
      enable_announcements: record?.notifications.enable_announcements ?? true,
      enable_fee_reminders: record?.notifications.enable_fee_reminders ?? true,
      fee_reminder_days_before: record?.notifications.fee_reminder_days_before ?? 3,
      fee_reminder_days_after: record?.notifications.fee_reminder_days_after ?? 5,
      enable_attendance_alerts: record?.notifications.enable_attendance_alerts ?? false,
    },
    operations: {
      attendance_cutoff_time: record?.operations.attendance_cutoff_time?.slice(0, 5) ?? "22:00",
      allow_attendance_corrections: record?.operations.allow_attendance_corrections ?? true,
      checkout_notice_days: record?.operations.checkout_notice_days ?? 3,
      require_checkout_clearance: record?.operations.require_checkout_clearance ?? true,
    },
    access: {
      allow_admin_manage_users: record?.access.allow_admin_manage_users ?? true,
      allow_admin_manage_hostel_settings: record?.access.allow_admin_manage_hostel_settings ?? true,
      allow_warden_view_reports: record?.access.allow_warden_view_reports ?? false,
      allow_staff_view_reports: record?.access.allow_staff_view_reports ?? false,
    },
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ShellState({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="settings-shell p-6 sm:p-7 xl:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--settings-text-primary)]">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--settings-text-secondary)]">{description}</p>
        </header>
        {children}
      </div>
    </section>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  badge,
  secondary = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  secondary?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={clsx("settings-card h-full", secondary && "settings-card-secondary")}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="settings-card-icon">
            <Icon className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--settings-text-primary)]">{title}</h2>
              {badge ? <span className="settings-status-badge">{badge}</span> : null}
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--settings-text-secondary)]">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldShell({
  label,
  helper,
  error,
  htmlFor,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="settings-field">
      <span className="settings-field-label">{label}</span>
      {helper ? <span className="settings-field-helper">{helper}</span> : null}
      {children}
      {error ? <span className="settings-field-error">{error}</span> : null}
    </label>
  );
}

function ToggleField({
  control,
  name,
  label,
  description,
  icon: Icon,
  disabled = false,
}: {
  control: Control<SettingsFormValues>;
  name: FieldPath<SettingsFormValues>;
  label: string;
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const checked = Boolean(field.value);

        return (
          <label className="settings-toggle-row" data-checked={checked ? "true" : "false"} data-disabled={disabled ? "true" : "false"}>
            <div className="flex items-start gap-3">
              <span className="settings-card-icon mt-0.5 h-9 w-9 rounded-xl">
                <Icon className="h-4 w-4" />
              </span>
              <div className="space-y-1">
                <span className="block text-sm font-medium text-[var(--settings-text-primary)]">{label}</span>
                <span className="block text-sm leading-6 text-[var(--settings-text-secondary)]">{description}</span>
              </div>
            </div>
            <span className="relative inline-flex items-center">
              <input
                ref={field.ref}
                type="checkbox"
                className="sr-only"
                checked={checked}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.checked)}
                disabled={disabled}
              />
              <span className="settings-toggle">
                <span className="settings-toggle-thumb" />
              </span>
            </span>
          </label>
        );
      }}
    />
  );
}

function SaveStateBadge({ tone, label }: { tone: SaveTone; label: string }) {
  const icon =
    tone === "success" ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : tone === "warning" || tone === "danger" ? (
      <AlertCircle className="h-4 w-4" />
    ) : (
      <Clock3 className="h-4 w-4" />
    );

  return (
    <span className="settings-status-badge" data-tone={tone === "default" ? undefined : tone}>
      {icon}
      {label}
    </span>
  );
}

export function SettingsScreen() {
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const settingsQuery = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<SettingsRecord | null>(null);

  const permissions = sessionData?.user.permissions ?? [];
  const canManageSettings = permissions.includes("*") || permissions.includes("manage_hostel_settings");

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: defaultValues(),
  });

  const isDirty = form.formState.isDirty;
  const isSaving = updateSettingsMutation.isPending;
  const record = settingsQuery.data?.data;
  const hostelName = useWatch({ control: form.control, name: "hostel.name" });
  const hostelCode = useWatch({ control: form.control, name: "hostel.code" });
  const hostelIsActive = useWatch({ control: form.control, name: "hostel.is_active" });
  const primaryColor = useWatch({ control: form.control, name: "branding.primary_color" });
  const accentColor = useWatch({ control: form.control, name: "branding.accent_color" });

  const effectiveRecord = useMemo(() => {
    if (!record) {
      return savedRecord;
    }

    if (!savedRecord) {
      return record;
    }

    return new Date(record.updated_at).getTime() >= new Date(savedRecord.updated_at).getTime() ? record : savedRecord;
  }, [record, savedRecord]);

  useEffect(() => {
    if (!effectiveRecord || isDirty) {
      return;
    }

    form.reset(defaultValues(effectiveRecord));
  }, [effectiveRecord, form, isDirty]);

  const resetTarget = effectiveRecord;
  const currentHostelName = hostelName?.trim() || effectiveRecord?.hostel.name || "Hostel";
  const currentHostelCode = hostelCode?.trim().toUpperCase() || effectiveRecord?.hostel.code || "HOSTEL";

  const saveState = useMemo(() => {
    if (isSaving) {
      return {
        tone: "warning" as SaveTone,
        label: "Saving settings",
        message: "Applying updated configuration across hostel operations.",
      };
    }

    if (errorMessage) {
      return {
        tone: "danger" as SaveTone,
        label: "Save failed",
        message: errorMessage,
      };
    }

    if (isDirty) {
      return {
        tone: "warning" as SaveTone,
        label: "Unsaved changes",
        message: "Review changes and save them before leaving this page.",
      };
    }

    if (feedback) {
      return {
        tone: "success" as SaveTone,
        label: "Changes saved",
        message: `Last saved ${formatDateTime(effectiveRecord?.updated_at ?? null)}.`,
      };
    }

    return {
      tone: "default" as SaveTone,
      label: "No pending changes",
      message: `Last saved ${formatDateTime(effectiveRecord?.updated_at ?? null)}.`,
    };
  }, [effectiveRecord?.updated_at, errorMessage, feedback, isDirty, isSaving]);

  async function onSubmit(values: SettingsFormValues) {
    setFeedback(null);
    setErrorMessage(null);

    const payload: SettingsUpdatePayload = {
      hostel: {
        ...values.hostel,
        code: values.hostel.code.trim().toUpperCase(),
      },
      financial: {
        ...values.financial,
        currency_code: values.financial.currency_code.trim().toUpperCase(),
      },
      notifications: values.notifications,
      operations: {
        ...values.operations,
        attendance_cutoff_time:
          values.operations.attendance_cutoff_time.length === 5
            ? `${values.operations.attendance_cutoff_time}:00`
            : values.operations.attendance_cutoff_time,
      },
      access: values.access,
      branding: {
        ...values.branding,
        brand_name: values.branding.brand_name.trim(),
        website_url: values.branding.website_url.trim(),
        primary_color: values.branding.primary_color.toUpperCase(),
        accent_color: values.branding.accent_color.toUpperCase(),
      },
    };

    try {
      const snapshot = await updateSettingsMutation.mutateAsync(payload);
      const nextRecord = snapshot.data;

      setSavedRecord(nextRecord);
      form.reset(defaultValues(nextRecord));
      setFeedback("Settings saved successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update settings.");
    }
  }

  function handleReset() {
    if (!resetTarget) {
      return;
    }

    form.reset(defaultValues(resetTarget));
    setFeedback(null);
    setErrorMessage(null);
  }

  if (sessionLoading || settingsQuery.isLoading) {
    return (
      <ShellState title="Settings" description="Configure hostel profile, billing defaults, notification rules, operations, and access permissions.">
        <div className="settings-card flex min-h-[220px] items-center justify-center">
          <div className="inline-flex items-center gap-3 text-sm text-[var(--settings-text-secondary)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading hostel settings...
          </div>
        </div>
      </ShellState>
    );
  }

  if (!canManageSettings) {
    return (
      <ShellState title="Settings" description="Configure hostel profile, billing defaults, notification rules, operations, and access permissions.">
        <div className="settings-card flex min-h-[220px] items-center justify-center">
          <div className="max-w-lg space-y-3 text-center">
            <h2 className="text-lg font-semibold text-[var(--settings-text-primary)]">Access restricted</h2>
            <p className="text-sm leading-6 text-[var(--settings-text-secondary)]">
              Your account does not currently have permission to manage hostel settings.
            </p>
          </div>
        </div>
      </ShellState>
    );
  }

  if (settingsQuery.isError || !record) {
    return (
      <ShellState title="Settings" description="Configure hostel profile, billing defaults, notification rules, operations, and access permissions.">
        <div className="settings-card border-[color:color-mix(in_srgb,var(--settings-danger)_40%,transparent)]">
          <div className="flex items-start gap-3">
            <span className="settings-card-icon text-[var(--settings-danger)]">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-[var(--settings-text-primary)]">Unable to load settings</h2>
              <p className="text-sm leading-6 text-[var(--settings-text-secondary)]">
                {settingsQuery.error instanceof Error ? settingsQuery.error.message : "Failed to load settings."}
              </p>
            </div>
          </div>
        </div>
      </ShellState>
    );
  }

  return (
    <section className="settings-shell p-6 sm:p-7 xl:p-8">
      <div className="space-y-6">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--settings-text-primary)] sm:text-[2.1rem]">Settings</h1>
              <p className="max-w-3xl text-sm leading-7 text-[var(--settings-text-secondary)] sm:text-[15px]">
                Configure hostel profile, billing defaults, notification rules, operations, and access permissions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SaveStateBadge tone={hostelIsActive ? "success" : "warning"} label={hostelIsActive ? "Hostel active" : "Hostel inactive"} />
              <SaveStateBadge tone={saveState.tone} label={saveState.label} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
            <article className="settings-meta-pill">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--settings-text-muted)]">Hostel name</p>
              <p className="mt-2 text-base font-semibold text-[var(--settings-text-primary)]">{currentHostelName}</p>
              <p className="mt-1 text-sm text-[var(--settings-text-secondary)]">{currentHostelCode}</p>
            </article>
            <article className="settings-meta-pill">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--settings-text-muted)]">Last saved</p>
              <p className="mt-2 text-base font-semibold text-[var(--settings-text-primary)]">{formatDateTime(effectiveRecord?.updated_at ?? null)}</p>
              <p className="mt-1 text-sm text-[var(--settings-text-secondary)]">
                {record.updated_by ? `Updated by ${record.updated_by}` : "Most recent saved snapshot"}
              </p>
            </article>
          </div>
        </header>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset disabled={isSaving} className="grid gap-5 xl:grid-cols-2">
            <SettingsCard
              icon={Building2}
              title="Hostel Profile"
              description="Basic hostel identity and contact information used across member records, invoices, and staff workflows."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Hostel Name" error={form.formState.errors.hostel?.name?.message} htmlFor="settings-hostel-name">
                  <input
                    id="settings-hostel-name"
                    autoComplete="organization"
                    className={clsx("settings-control", form.formState.errors.hostel?.name && "settings-control-error")}
                    {...form.register("hostel.name")}
                  />
                </FieldShell>

                <FieldShell label="Hostel Code" helper="Used in system references and printed documents." error={form.formState.errors.hostel?.code?.message} htmlFor="settings-hostel-code">
                  <input
                    id="settings-hostel-code"
                    autoComplete="off"
                    className={clsx("settings-control uppercase", form.formState.errors.hostel?.code && "settings-control-error")}
                    {...form.register("hostel.code")}
                  />
                </FieldShell>

                <FieldShell label="Email" helper="Primary contact used for billing and system communication." error={form.formState.errors.hostel?.email?.message} htmlFor="settings-hostel-email">
                  <input
                    id="settings-hostel-email"
                    type="email"
                    autoComplete="email"
                    className={clsx("settings-control", form.formState.errors.hostel?.email && "settings-control-error")}
                    {...form.register("hostel.email")}
                  />
                </FieldShell>

                <FieldShell label="Phone" helper="Main operational contact number for residents and staff." htmlFor="settings-hostel-phone">
                  <input id="settings-hostel-phone" autoComplete="tel" className="settings-control" {...form.register("hostel.phone")} />
                </FieldShell>

                <FieldShell label="Timezone" helper="Controls attendance timestamps, due dates, and system reminders." error={form.formState.errors.hostel?.timezone?.message} htmlFor="settings-hostel-timezone">
                  <input
                    id="settings-hostel-timezone"
                    autoComplete="off"
                    className={clsx("settings-control", form.formState.errors.hostel?.timezone && "settings-control-error")}
                    {...form.register("hostel.timezone")}
                  />
                </FieldShell>

                <FieldShell label="Address" helper="Stored as the primary hostel location shown in system records." htmlFor="settings-hostel-address">
                  <textarea id="settings-hostel-address" className="settings-control settings-textarea" {...form.register("hostel.address")} />
                </FieldShell>

                <div className="md:col-span-2">
                  <ToggleField
                    control={form.control}
                    name="hostel.is_active"
                    disabled={isSaving}
                    icon={ShieldCheck}
                    label="Hostel is active"
                    description="Keep this enabled while the hostel is operating and available across the platform."
                  />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={Wallet}
              title="Financial Defaults"
              description="Default billing and payment behavior used when invoices, deposits, and admissions are created."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Currency Code" helper="Used for invoices, deposits, fees, and balances." error={form.formState.errors.financial?.currency_code?.message} htmlFor="settings-financial-currency">
                  <input
                    id="settings-financial-currency"
                    maxLength={3}
                    className={clsx("settings-control uppercase", form.formState.errors.financial?.currency_code && "settings-control-error")}
                    {...form.register("financial.currency_code")}
                  />
                </FieldShell>

                <FieldShell
                  label="Invoice Due Day"
                  helper="Choose a billing day between 1 and 28 to avoid month-end date gaps."
                  error={form.formState.errors.financial?.invoice_due_day?.message}
                  htmlFor="settings-financial-due-day"
                >
                  <input
                    id="settings-financial-due-day"
                    type="number"
                    min={1}
                    max={28}
                    className={clsx("settings-control", form.formState.errors.financial?.invoice_due_day && "settings-control-error")}
                    {...form.register("financial.invoice_due_day", { valueAsNumber: true })}
                  />
                </FieldShell>

                <FieldShell
                  label="Late Fee Amount"
                  helper="Applied when an invoice remains unpaid after its due date."
                  error={form.formState.errors.financial?.late_fee_amount?.message}
                  htmlFor="settings-financial-late-fee"
                >
                  <input
                    id="settings-financial-late-fee"
                    type="number"
                    min={0}
                    step="0.01"
                    className={clsx("settings-control", form.formState.errors.financial?.late_fee_amount && "settings-control-error")}
                    {...form.register("financial.late_fee_amount", { valueAsNumber: true })}
                  />
                </FieldShell>

                <FieldShell
                  label="Default Security Deposit"
                  helper="Prefilled when a new member record is created."
                  error={form.formState.errors.financial?.default_security_deposit?.message}
                  htmlFor="settings-financial-deposit"
                >
                  <input
                    id="settings-financial-deposit"
                    type="number"
                    min={0}
                    step="0.01"
                    className={clsx("settings-control", form.formState.errors.financial?.default_security_deposit && "settings-control-error")}
                    {...form.register("financial.default_security_deposit", { valueAsNumber: true })}
                  />
                </FieldShell>

                <FieldShell
                  label="Default Admission Fee"
                  helper="Applied as the standard onboarding fee for new admissions."
                  error={form.formState.errors.financial?.default_admission_fee?.message}
                  htmlFor="settings-financial-admission"
                >
                  <input
                    id="settings-financial-admission"
                    type="number"
                    min={0}
                    step="0.01"
                    className={clsx("settings-control", form.formState.errors.financial?.default_admission_fee && "settings-control-error")}
                    {...form.register("financial.default_admission_fee", { valueAsNumber: true })}
                  />
                </FieldShell>

                <div className="md:col-span-2 space-y-3">
                  <ToggleField
                    control={form.control}
                    name="financial.allow_partial_payments"
                    disabled={isSaving}
                    icon={Wallet}
                    label="Allow partial payments"
                    description="Let staff record part-payments against open invoices instead of requiring full settlement."
                  />
                  <ToggleField
                    control={form.control}
                    name="financial.auto_apply_member_credit"
                    disabled={isSaving}
                    icon={Wallet}
                    label="Auto-apply member credit"
                    description="Automatically use stored member credit before leaving a remaining balance due."
                  />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={Bell}
              title="Notification Policies"
              description="Communication and reminder settings used for announcements, dues follow-up, and attendance alerts."
            >
              <div className="space-y-3">
                <ToggleField
                  control={form.control}
                  name="notifications.enable_announcements"
                  disabled={isSaving}
                  icon={Bell}
                  label="Enable announcements"
                  description="Allow staff to publish hostel-wide notices for residents and operational teams."
                />
                <ToggleField
                  control={form.control}
                  name="notifications.enable_fee_reminders"
                  disabled={isSaving}
                  icon={Bell}
                  label="Enable fee reminders"
                  description="Send payment reminder workflows before and after invoice due dates."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell
                    label="Reminder Days Before Due Date"
                    helper="How many days in advance to remind residents about upcoming dues."
                    error={form.formState.errors.notifications?.fee_reminder_days_before?.message}
                    htmlFor="settings-notifications-before"
                  >
                    <input
                      id="settings-notifications-before"
                      type="number"
                      min={0}
                      max={30}
                      className={clsx("settings-control", form.formState.errors.notifications?.fee_reminder_days_before && "settings-control-error")}
                      {...form.register("notifications.fee_reminder_days_before", { valueAsNumber: true })}
                    />
                  </FieldShell>

                  <FieldShell
                    label="Reminder Days After Due Date"
                    helper="How many days after the due date to continue overdue follow-up."
                    error={form.formState.errors.notifications?.fee_reminder_days_after?.message}
                    htmlFor="settings-notifications-after"
                  >
                    <input
                      id="settings-notifications-after"
                      type="number"
                      min={0}
                      max={30}
                      className={clsx("settings-control", form.formState.errors.notifications?.fee_reminder_days_after && "settings-control-error")}
                      {...form.register("notifications.fee_reminder_days_after", { valueAsNumber: true })}
                    />
                  </FieldShell>
                </div>
                <ToggleField
                  control={form.control}
                  name="notifications.enable_attendance_alerts"
                  disabled={isSaving}
                  icon={Bell}
                  label="Enable attendance alerts"
                  description="Notify staff when daily attendance is missed, late, or needs escalation."
                />
              </div>
            </SettingsCard>
            <SettingsCard
              icon={Clock3}
              title="Operations"
              description="Attendance and checkout rules that guide daily resident operations and warden workflows."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell
                  label="Attendance Cutoff Time"
                  helper="Attendance changes after this time should be treated as exceptions."
                  error={form.formState.errors.operations?.attendance_cutoff_time?.message}
                  htmlFor="settings-operations-attendance-cutoff"
                >
                  <input
                    id="settings-operations-attendance-cutoff"
                    type="time"
                    className={clsx("settings-control", form.formState.errors.operations?.attendance_cutoff_time && "settings-control-error")}
                    {...form.register("operations.attendance_cutoff_time")}
                  />
                </FieldShell>

                <FieldShell
                  label="Checkout Notice Days"
                  helper="Minimum notice expected before a scheduled checkout."
                  error={form.formState.errors.operations?.checkout_notice_days?.message}
                  htmlFor="settings-operations-checkout-days"
                >
                  <input
                    id="settings-operations-checkout-days"
                    type="number"
                    min={0}
                    max={60}
                    className={clsx("settings-control", form.formState.errors.operations?.checkout_notice_days && "settings-control-error")}
                    {...form.register("operations.checkout_notice_days", { valueAsNumber: true })}
                  />
                </FieldShell>

                <div className="md:col-span-2 space-y-3">
                  <ToggleField
                    control={form.control}
                    name="operations.allow_attendance_corrections"
                    disabled={isSaving}
                    icon={Clock3}
                    label="Allow attendance corrections"
                    description="Permit authorized staff to edit marked attendance after the initial record is submitted."
                  />
                  <ToggleField
                    control={form.control}
                    name="operations.require_checkout_clearance"
                    disabled={isSaving}
                    icon={ShieldCheck}
                    label="Require checkout clearance"
                    description="Require dues, key return, and room clearance checks before a checkout can be completed."
                  />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={ShieldCheck}
              title="Access Policies"
              description="Role-based access permissions for staff management, settings control, and report visibility."
            >
              <div className="space-y-3">
                <ToggleField
                  control={form.control}
                  name="access.allow_admin_manage_users"
                  disabled={isSaving}
                  icon={ShieldCheck}
                  label="Allow admins to manage staff users"
                  description="Lets admins create, edit, and deactivate staff accounts without owner intervention."
                />
                <ToggleField
                  control={form.control}
                  name="access.allow_admin_manage_hostel_settings"
                  disabled={isSaving}
                  icon={ShieldCheck}
                  label="Allow admins to manage hostel settings"
                  description="Lets admins update financial defaults, operations, notifications, and hostel configuration."
                />
                <ToggleField
                  control={form.control}
                  name="access.allow_warden_view_reports"
                  disabled={isSaving}
                  icon={ShieldCheck}
                  label="Allow wardens to view reports"
                  description="Gives wardens access to reporting views needed for day-to-day hostel supervision."
                />
                <ToggleField
                  control={form.control}
                  name="access.allow_staff_view_reports"
                  disabled={isSaving}
                  icon={ShieldCheck}
                  label="Allow staff to view reports"
                  description="Allows general staff to open report views without broader management permissions."
                />
              </div>
            </SettingsCard>

            <SettingsCard
              icon={Palette}
              title="Branding"
              description="Optional identity details used for hostel-facing documents, announcements, and public links."
              badge="Optional"
              secondary
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Brand Name" helper="Shown on hostel-facing communication and printed documents." htmlFor="settings-branding-name">
                  <input id="settings-branding-name" className="settings-control" {...form.register("branding.brand_name")} />
                </FieldShell>

                <FieldShell
                  label="Website URL"
                  helper="Optional public website or booking page for the hostel."
                  error={form.formState.errors.branding?.website_url?.message}
                  htmlFor="settings-branding-website"
                >
                  <input
                    id="settings-branding-website"
                    type="url"
                    className={clsx("settings-control", form.formState.errors.branding?.website_url && "settings-control-error")}
                    {...form.register("branding.website_url")}
                  />
                </FieldShell>

                <FieldShell
                  label="Primary Color"
                  helper="Used for primary buttons and brand accents."
                  error={form.formState.errors.branding?.primary_color?.message}
                  htmlFor="settings-branding-primary"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-11 w-11 rounded-[14px] border border-[var(--settings-border)]" style={{ backgroundColor: primaryColor || "#2D6CFF" }} />
                    <input
                      id="settings-branding-primary"
                      maxLength={7}
                      className={clsx("settings-control font-mono uppercase", form.formState.errors.branding?.primary_color && "settings-control-error")}
                      {...form.register("branding.primary_color")}
                    />
                  </div>
                </FieldShell>

                <FieldShell
                  label="Accent Color"
                  helper="Used for secondary highlights, tags, and visual emphasis."
                  error={form.formState.errors.branding?.accent_color?.message}
                  htmlFor="settings-branding-accent"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-11 w-11 rounded-[14px] border border-[var(--settings-border)]" style={{ backgroundColor: accentColor || "#F59E0B" }} />
                    <input
                      id="settings-branding-accent"
                      maxLength={7}
                      className={clsx("settings-control font-mono uppercase", form.formState.errors.branding?.accent_color && "settings-control-error")}
                      {...form.register("branding.accent_color")}
                    />
                  </div>
                </FieldShell>
              </div>
            </SettingsCard>
          </fieldset>

          <div className="settings-savebar" aria-live="polite">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SaveStateBadge tone={saveState.tone} label={saveState.label} />
                <span className="text-sm text-[var(--settings-text-secondary)]">Last saved {formatDateTime(effectiveRecord?.updated_at ?? null)}</span>
              </div>
              <p className="text-sm leading-6 text-[var(--settings-text-secondary)]">{saveState.message}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleReset} disabled={!isDirty || isSaving || !resetTarget} className="settings-button-secondary">
                <RotateCcw className="h-4 w-4" />
                Reset changes
              </button>
              <button type="submit" disabled={isSaving || !isDirty} className="settings-button-primary">
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
