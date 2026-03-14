"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BedSingle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  SquareTerminal,
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
      className="mx-auto w-full max-w-[540px] space-y-6 sm:space-y-7"
      onSubmit={form.handleSubmit(async (values) => mutation.mutate(values))}
    >
      <div className="space-y-5 text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5f88ff_0%,#2f52ff_55%,#2730c5_100%)] text-white shadow-[0_12px_28px_rgba(46,70,255,0.45)]">
            <BedSingle className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">Hostel Manager</p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Operations Portal</p>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Welcome Back</h1>
          <p className="mx-auto max-w-md text-sm leading-6 text-slate-300 sm:text-base">
            Manage rooms, residents, fees, and daily operations from one secure, mobile-friendly workspace.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2 text-left">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Username</span>
          <div
            className={`group flex items-center gap-3 rounded-2xl border bg-white/[0.04] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-[#7ca4ff] focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_4px_rgba(87,124,255,0.15)] ${
              usernameError ? "border-rose-400/60" : "border-white/10"
            }`}
          >
            <UserRound className="h-5 w-5 shrink-0 text-slate-400 transition group-focus-within:text-[#8facff]" />
            <input
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:text-base"
              {...form.register("username")}
            />
          </div>
          {usernameError ? <span className="text-xs text-rose-300">{usernameError}</span> : null}
        </label>

        <label className="block space-y-2 text-left">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Password</span>
          <div
            className={`group flex items-center gap-3 rounded-2xl border bg-white/[0.04] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition focus-within:border-[#7ca4ff] focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_4px_rgba(87,124,255,0.15)] ${
              passwordError ? "border-rose-400/60" : "border-white/10"
            }`}
          >
            <LockKeyhole className="h-5 w-5 shrink-0 text-slate-400 transition group-focus-within:text-[#8facff]" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:text-base"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
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

      <div className="flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
          Secure role-based login
        </div>
        <p className="text-left text-slate-400 sm:text-right">Password reset support is handled by your hostel admin.</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#6d97ff_0%,#3657ff_48%,#2637d2_100%)] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_35px_rgba(41,74,255,0.38)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Signing In..." : "Sign In"}
      </button>

      <div className="space-y-4 border-t border-white/10 pt-5 text-center">
        <p className="text-sm text-slate-400">
          Need access? <span className="font-semibold text-slate-200">Contact Admin</span>
        </p>

        <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300 sm:grid-cols-3">
          <div className="flex items-center justify-center gap-2 rounded-xl px-2 py-2">
            <ShieldCheck className="h-4 w-4 text-slate-300" />
            <span>Secure Access</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl px-2 py-2">
            <SquareTerminal className="h-4 w-4 text-slate-300" />
            <span>Role-Based</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl px-2 py-2">
            <UserRound className="h-4 w-4 text-slate-300" />
            <span>Mobile Ready</span>
          </div>
        </div>
      </div>
    </form>
  );
}
