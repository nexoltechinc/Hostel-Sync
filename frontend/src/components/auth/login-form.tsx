"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { login } from "@/lib/api";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      const nextRoute = nextPath || "/dashboard";
      window.location.assign(nextRoute);
    },
  });

  const isSubmitting = form.formState.isSubmitting || mutation.isPending;
  const usernameError = form.formState.errors.username?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form
      className="mx-auto w-full max-w-[520px] space-y-6 sm:space-y-7"
      onSubmit={form.handleSubmit(async (values) => mutation.mutate(values))}
    >
      <div className="space-y-6 text-center">
        <div
          className="inline-flex items-center gap-3 rounded-full border px-4 py-2.5 backdrop-blur"
          style={{
            backgroundColor: "var(--login-chip-bg)",
            borderColor: "var(--login-chip-border)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6d94ff_0%,#3658ff_55%,#2840c9_100%)] text-white shadow-[0_14px_30px_rgba(55,82,255,0.36)]">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-lg font-semibold tracking-tight" style={{ color: "var(--login-chip-text)" }}>
              Hostel Sync
            </p>
            <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "var(--login-meta-text)" }}>
              Operations Portal
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-[clamp(3rem,7vw,4.35rem)] font-semibold leading-[0.96] tracking-[-0.045em]" style={{ color: "var(--color-text-strong)" }}>
            Welcome Back
          </h1>
          <p className="mx-auto max-w-[29rem] text-[15px] leading-7 sm:text-base" style={{ color: "var(--login-copy)" }}>
            Manage rooms, residents, fees, and daily operations with ease.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="block space-y-2 text-left">
          <div
            className="group flex items-center gap-4 rounded-[1.35rem] border px-5 py-4 transition duration-200 hover:[border-color:var(--login-field-hover-border)] focus-within:[border-color:var(--login-field-border-strong)] focus-within:shadow-[0_0_0_4px_rgba(82,111,255,0.14)]"
            style={{
              backgroundColor: "var(--login-field-bg)",
              borderColor: usernameError ? "rgba(251, 113, 133, 0.6)" : "var(--login-field-border)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -10px 24px rgba(3, 7, 18, 0.08)",
            }}
          >
            <Mail className="h-5 w-5 shrink-0 transition group-focus-within:text-[#8facff]" style={{ color: "var(--login-icon)" }} />
            <input
              type="text"
              autoComplete="username"
              placeholder="Username"
              className="login-field-input w-full bg-transparent text-sm outline-none placeholder:text-[var(--login-field-placeholder)] sm:text-base"
              style={{ color: "var(--color-text-strong)" }}
              {...form.register("username")}
            />
          </div>
          {usernameError ? <span className="text-xs text-rose-300">{usernameError}</span> : null}
        </label>

        <label className="block space-y-2 text-left">
          <div
            className="group flex items-center gap-4 rounded-[1.35rem] border px-5 py-4 transition duration-200 hover:[border-color:var(--login-field-hover-border)] focus-within:[border-color:var(--login-field-border-strong)] focus-within:shadow-[0_0_0_4px_rgba(82,111,255,0.14)]"
            style={{
              backgroundColor: "var(--login-field-bg)",
              borderColor: passwordError ? "rgba(251, 113, 133, 0.6)" : "var(--login-field-border)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -10px 24px rgba(3, 7, 18, 0.08)",
            }}
          >
            <LockKeyhole className="h-5 w-5 shrink-0 transition group-focus-within:text-[#8facff]" style={{ color: "var(--login-icon)" }} />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              className="login-field-input w-full bg-transparent text-sm outline-none placeholder:text-[var(--login-field-placeholder)] sm:text-base"
              style={{ color: "var(--color-text-strong)" }}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/[0.04]"
              style={{ color: "var(--login-icon)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {passwordError ? <span className="text-xs text-rose-300">{passwordError}</span> : null}
        </label>
      </div>

      {mutation.error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <p>{mutation.error.message}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ color: "var(--login-copy)" }}>
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            checked={rememberSession}
            onChange={(event) => setRememberSession(event.target.checked)}
            className="h-4 w-4 rounded border-slate-500 bg-transparent text-[#3f63ff] focus:ring-[#7088ff]"
          />
          Remember me
        </label>
        <Link href="/forgot-password" className="text-left font-medium text-[#6f8dff] sm:text-right">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-[1.35rem] bg-[linear-gradient(135deg,#6f98ff_0%,#456cff_38%,#314df0_72%,#283fdb_100%)] px-4 py-4 text-base font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
        style={{ boxShadow: "var(--login-button-shadow)" }}
      >
        <span className="pointer-events-none absolute inset-y-0 -left-[30%] w-[26%] skew-x-[-20deg] bg-white/20 blur-xl transition-transform duration-700 group-hover:translate-x-[420%]" />
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2)_0%,transparent_52%)] opacity-80" />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Signing in..." : "Sign In"}
        </span>
      </button>

      <div className="space-y-5 text-center">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, var(--login-field-border), transparent)" }} />
          <span className="text-sm" style={{ color: "var(--login-muted)" }}>
            or
          </span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, var(--login-field-border), transparent)" }} />
        </div>

        <button
          type="button"
          disabled
          className="inline-flex w-full cursor-default items-center justify-center gap-3 rounded-[1.35rem] border px-4 py-4 text-base font-medium disabled:opacity-100"
          style={{
            borderColor: "var(--login-field-border)",
            backgroundColor: "var(--login-field-bg)",
            color: "var(--color-text-strong)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <span className="text-[1.9rem] font-semibold leading-none">
            <span className="text-[#ea4335]">G</span>
          </span>
          Continue with Google
        </button>

        <p className="text-[15px]" style={{ color: "var(--login-muted)" }}>
          Don&apos;t have an account? <span className="font-semibold text-[var(--color-text-strong)]">Contact Admin</span>
        </p>

        <div className="space-y-4 border-t pt-5 text-center" style={{ borderColor: "var(--login-field-border)" }}>
          <div
            className="grid gap-2 rounded-[1.35rem] border p-2.5 text-sm sm:grid-cols-3"
            style={{
              borderColor: "var(--login-badge-border)",
              backgroundColor: "var(--login-badge-bg)",
              color: "var(--login-copy)",
            }}
          >
            <div className="flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 sm:border-r" style={{ borderColor: "var(--login-badge-border)" }}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(123,148,255,0.18)_0%,rgba(123,148,255,0.04)_72%)]">
                <ShieldCheck className="h-4 w-4 text-[#7b94ff]" />
              </span>
              <span>Secure Access</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 sm:border-r" style={{ borderColor: "var(--login-badge-border)" }}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(123,148,255,0.18)_0%,rgba(123,148,255,0.04)_72%)]">
                <Building2 className="h-4 w-4 text-[#7b94ff]" />
              </span>
              <span>Role-Based Login</span>
            </div>
            <div className="flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(123,148,255,0.18)_0%,rgba(123,148,255,0.04)_72%)]">
                <Smartphone className="h-4 w-4 text-[#7b94ff]" />
              </span>
              <span>24/7 Management</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
