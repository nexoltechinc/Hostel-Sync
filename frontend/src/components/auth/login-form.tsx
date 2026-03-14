"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRouting, startTransition] = useTransition();
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
      startTransition(() => {
        router.replace(nextRoute);
      });
    },
  });

  const isSubmitting = form.formState.isSubmitting || mutation.isPending || isRouting;
  const usernameError = form.formState.errors.username?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <form
      className="mx-auto w-full max-w-2xl space-y-6"
      onSubmit={form.handleSubmit(async (values) => mutation.mutate(values))}
    >
      <div className="space-y-5 text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-[#d8e0f2] bg-white px-4 py-2 shadow-sm">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f73ff_0%,#2847d9_100%)] text-white shadow-[0_12px_24px_rgba(47,79,215,0.2)]">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-base font-semibold tracking-tight text-[#1d2648] sm:text-lg">Hostel Manager</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7c89a8]">Operations Portal</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a96b3]">Secure Admin Access</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d2648] sm:text-4xl">Welcome back</h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-[#69758f] sm:text-base">
            Manage residents, room allotments, fees, and daily hostel operations from one clean, mobile-ready workspace.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="block space-y-2 text-left">
          <span className="text-sm font-medium text-[#3f4b69]">Username</span>
          <div
            className={`group flex items-center gap-3 rounded-2xl border bg-[#f7f9fe] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition focus-within:border-[#6f8dff] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(96,124,255,0.14)] ${
              usernameError ? "border-rose-300 bg-rose-50/70" : "border-[#dbe3f4]"
            }`}
          >
            <UserRound className="h-5 w-5 shrink-0 text-[#8a96b1] transition group-focus-within:text-[#5573ff]" />
            <input
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              className="w-full bg-transparent text-sm text-[#1f2947] outline-none placeholder:text-[#9da8c0] sm:text-base"
              {...form.register("username")}
            />
          </div>
          {usernameError ? <span className="text-xs text-rose-500">{usernameError}</span> : null}
        </label>

        <label className="block space-y-2 text-left">
          <span className="text-sm font-medium text-[#3f4b69]">Password</span>
          <div
            className={`group flex items-center gap-3 rounded-2xl border bg-[#f7f9fe] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition focus-within:border-[#6f8dff] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(96,124,255,0.14)] ${
              passwordError ? "border-rose-300 bg-rose-50/70" : "border-[#dbe3f4]"
            }`}
          >
            <LockKeyhole className="h-5 w-5 shrink-0 text-[#8a96b1] transition group-focus-within:text-[#5573ff]" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full bg-transparent text-sm text-[#1f2947] outline-none placeholder:text-[#9da8c0] sm:text-base"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#8a96b1] transition hover:bg-[#edf1fb] hover:text-[#2a45d4]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {passwordError ? <span className="text-xs text-rose-500">{passwordError}</span> : null}
        </label>
      </div>

      {mutation.error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p>{mutation.error.message}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 text-sm text-[#65718c] sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            checked={rememberSession}
            onChange={(event) => setRememberSession(event.target.checked)}
            className="h-4 w-4 rounded border-[#bcc8e2] text-[#3550e8] focus:ring-[#7f96ff]"
          />
          Keep this device signed in
        </label>
        <p className="text-left sm:text-right">
          Need help signing in? <span className="font-medium text-[#3550e8]">Contact admin</span>
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#6f93ff_0%,#4464f0_55%,#2844d8_100%)] px-4 py-4 text-base font-semibold text-white shadow-[0_16px_34px_rgba(76,99,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>

      <div className="space-y-4 border-t border-[#e7ecf7] pt-5 text-center">
        <p className="text-sm text-[#7783a0]">
          Access is managed by your hostel administrator.
        </p>

        <div className="grid gap-2 rounded-2xl border border-[#e1e7f5] bg-[#f8faff] p-3 text-sm text-[#56627f] sm:grid-cols-3">
          <div className="flex items-center justify-center gap-2 rounded-xl px-2 py-2">
            <ShieldCheck className="h-4 w-4 text-[#5164c9]" />
            <span>Secure Access</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl px-2 py-2">
            <Building2 className="h-4 w-4 text-[#5164c9]" />
            <span>Role-Based</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl px-2 py-2">
            <Smartphone className="h-4 w-4 text-[#5164c9]" />
            <span>Mobile Ready</span>
          </div>
        </div>
      </div>
    </form>
  );
}
