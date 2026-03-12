"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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

  return (
    <form
      className="panel w-full max-w-md space-y-5 p-6 md:p-7"
      onSubmit={form.handleSubmit(async (values) => mutation.mutate(values))}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500">Access your hostel operations dashboard.</p>
      </div>

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Username</span>
          <input
            type="text"
            autoComplete="username"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
            {...form.register("username")}
          />
          {form.formState.errors.username ? (
            <span className="text-xs text-rose-600">{form.formState.errors.username.message}</span>
          ) : null}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <span className="text-xs text-rose-600">{form.formState.errors.password.message}</span>
          ) : null}
        </label>
      </div>

      {mutation.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{mutation.error.message}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
