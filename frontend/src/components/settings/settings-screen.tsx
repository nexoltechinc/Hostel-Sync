"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Building2, Clock3, LoaderCircle, Palette, Save, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
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
    primary_color: z.string().regex(hexColorPattern, "Use a hex color like #1667D6."),
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
      primary_color: record?.branding.primary_color ?? "#1667D6",
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
    return "Never updated";
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function SectionCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldGroup({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function ToggleRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SettingsScreen() {
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const settingsQuery = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const permissions = sessionData?.user.permissions ?? [];
  const canManageSettings = permissions.includes("*") || permissions.includes("manage_hostel_settings");

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (settingsQuery.data?.data) {
      form.reset(defaultValues(settingsQuery.data.data));
    }
  }, [form, settingsQuery.data]);

  const record = settingsQuery.data?.data;
  const financial = useWatch({
    control: form.control,
    name: "financial",
  });

  async function onSubmit(values: SettingsFormValues) {
    setFeedback(null);
    setErrorMessage(null);

    const payload: SettingsUpdatePayload = {
      hostel: {
        ...values.hostel,
        code: values.hostel.code.trim().toUpperCase(),
      },
      branding: {
        ...values.branding,
        brand_name: values.branding.brand_name.trim(),
        website_url: values.branding.website_url.trim(),
        primary_color: values.branding.primary_color.toUpperCase(),
        accent_color: values.branding.accent_color.toUpperCase(),
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
    };

    try {
      await updateSettingsMutation.mutateAsync(payload);
      setFeedback("Settings updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update settings.");
    }
  }

  if (sessionLoading || settingsQuery.isLoading) {
    return (
      <section className="grid min-h-[320px] place-items-center">
        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading settings...
        </div>
      </section>
    );
  }

  if (!canManageSettings) {
    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module 10</p>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600">Centralized configuration, defaults, and governance controls.</p>
        </header>
        <div className="panel p-6 text-sm text-slate-600">
          Your account does not currently have permission to manage hostel settings.
        </div>
      </section>
    );
  }

  if (settingsQuery.isError || !record) {
    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module 10</p>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600">Centralized configuration, defaults, and governance controls.</p>
        </header>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {settingsQuery.error instanceof Error ? settingsQuery.error.message : "Failed to load settings."}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module 10</p>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600">
            Configure hostel identity, financial defaults, operational rules, and role-sensitive governance.
          </p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p className="font-medium text-slate-900">{record.hostel.name}</p>
          <p>
            Last updated {formatDateTime(record.updated_at)}
            {record.updated_by ? ` by ${record.updated_by}` : ""}
          </p>
        </div>
      </header>

      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</div> : null}
      {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="panel p-5">
          <p className="text-sm font-medium text-slate-600">Hostel Code</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{record.hostel.code}</p>
          <p className="mt-1 text-xs text-slate-500">{record.hostel.is_active ? "Operational" : "Inactive"}</p>
        </article>
        <article className="panel p-5">
          <p className="text-sm font-medium text-slate-600">Billing Default</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{financial.invoice_due_day}</p>
          <p className="mt-1 text-xs text-slate-500">Invoice due day each month</p>
        </article>
        <article className="panel p-5">
          <p className="text-sm font-medium text-slate-600">Security Deposit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(financial.default_security_deposit, financial.currency_code)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Default financial baseline</p>
        </article>
      </div>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard icon={<Building2 className="h-5 w-5" />} title="Hostel Profile" description="Identity and operational context used across the platform.">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldGroup label="Hostel Name" error={form.formState.errors.hostel?.name?.message}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("hostel.name")} />
              </FieldGroup>
              <FieldGroup label="Hostel Code" error={form.formState.errors.hostel?.code?.message}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("hostel.code")} />
              </FieldGroup>
              <FieldGroup label="Email" error={form.formState.errors.hostel?.email?.message}>
                <input type="email" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("hostel.email")} />
              </FieldGroup>
              <FieldGroup label="Phone" error={undefined}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("hostel.phone")} />
              </FieldGroup>
              <FieldGroup label="Timezone" error={form.formState.errors.hostel?.timezone?.message}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("hostel.timezone")} />
              </FieldGroup>
              <FieldGroup label="Address" error={undefined}>
                <textarea rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("hostel.address")} />
              </FieldGroup>
              <ToggleRow label="Hostel is active">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("hostel.is_active")} />
              </ToggleRow>
            </div>
          </SectionCard>

          <SectionCard icon={<Palette className="h-5 w-5" />} title="Branding" description="Visual identity and public-facing profile settings.">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldGroup label="Brand Name" error={undefined}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("branding.brand_name")} />
              </FieldGroup>
              <FieldGroup label="Website URL" error={form.formState.errors.branding?.website_url?.message}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("branding.website_url")} />
              </FieldGroup>
              <FieldGroup label="Primary Color" error={form.formState.errors.branding?.primary_color?.message}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("branding.primary_color")} />
              </FieldGroup>
              <FieldGroup label="Accent Color" error={form.formState.errors.branding?.accent_color?.message}>
                <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("branding.accent_color")} />
              </FieldGroup>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard icon={<Wallet className="h-5 w-5" />} title="Financial Defaults" description="Default fee timing and payment behavior.">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldGroup label="Currency Code" error={form.formState.errors.financial?.currency_code?.message}>
                <input maxLength={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("financial.currency_code")} />
              </FieldGroup>
              <FieldGroup label="Invoice Due Day" error={undefined}>
                <input type="number" min={1} max={28} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("financial.invoice_due_day", { valueAsNumber: true })} />
              </FieldGroup>
              <FieldGroup label="Late Fee Amount" error={undefined}>
                <input type="number" min={0} step="0.01" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("financial.late_fee_amount", { valueAsNumber: true })} />
              </FieldGroup>
              <FieldGroup label="Default Security Deposit" error={undefined}>
                <input type="number" min={0} step="0.01" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("financial.default_security_deposit", { valueAsNumber: true })} />
              </FieldGroup>
              <FieldGroup label="Default Admission Fee" error={undefined}>
                <input type="number" min={0} step="0.01" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("financial.default_admission_fee", { valueAsNumber: true })} />
              </FieldGroup>
              <ToggleRow label="Allow partial payments">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("financial.allow_partial_payments")} />
              </ToggleRow>
              <ToggleRow label="Auto-apply member credit">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("financial.auto_apply_member_credit")} />
              </ToggleRow>
            </div>
          </SectionCard>

          <SectionCard icon={<Bell className="h-5 w-5" />} title="Notification Policies" description="Reminders, announcements, and attendance alerts.">
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label="Enable announcements">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("notifications.enable_announcements")} />
              </ToggleRow>
              <ToggleRow label="Enable fee reminders">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("notifications.enable_fee_reminders")} />
              </ToggleRow>
              <FieldGroup label="Reminder Days Before Due Date" error={undefined}>
                <input type="number" min={0} max={30} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("notifications.fee_reminder_days_before", { valueAsNumber: true })} />
              </FieldGroup>
              <FieldGroup label="Reminder Days After Due Date" error={undefined}>
                <input type="number" min={0} max={30} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("notifications.fee_reminder_days_after", { valueAsNumber: true })} />
              </FieldGroup>
              <ToggleRow label="Enable attendance alerts">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("notifications.enable_attendance_alerts")} />
              </ToggleRow>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard icon={<Clock3 className="h-5 w-5" />} title="Operations" description="Attendance timing and checkout policy controls.">
            <div className="grid gap-3 md:grid-cols-2">
              <FieldGroup label="Attendance Cutoff Time" error={undefined}>
                <input type="time" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("operations.attendance_cutoff_time")} />
              </FieldGroup>
              <FieldGroup label="Checkout Notice Days" error={undefined}>
                <input type="number" min={0} max={60} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]" {...form.register("operations.checkout_notice_days", { valueAsNumber: true })} />
              </FieldGroup>
              <ToggleRow label="Allow attendance corrections">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("operations.allow_attendance_corrections")} />
              </ToggleRow>
              <ToggleRow label="Require checkout clearance">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("operations.require_checkout_clearance")} />
              </ToggleRow>
            </div>
          </SectionCard>

          <SectionCard icon={<ShieldCheck className="h-5 w-5" />} title="Access Policies" description="Decide which roles inherit extra management and reporting visibility.">
            <div className="space-y-3">
              <ToggleRow label="Allow admins to manage staff users">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("access.allow_admin_manage_users")} />
              </ToggleRow>
              <ToggleRow label="Allow admins to manage hostel settings">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("access.allow_admin_manage_hostel_settings")} />
              </ToggleRow>
              <ToggleRow label="Allow wardens to view reports">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("access.allow_warden_view_reports")} />
              </ToggleRow>
              <ToggleRow label="Allow staff to view reports">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-600)]" {...form.register("access.allow_staff_view_reports")} />
              </ToggleRow>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            These settings affect billing defaults, communication behavior, reporting visibility, and operational workflow rules.
          </p>
          <button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {updateSettingsMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
